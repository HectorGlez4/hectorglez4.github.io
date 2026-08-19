import { afterAll, describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  AUTOR_VALIDO,
  TEMA_VALIDO,
  citaValida,
  coleccionValida,
  construirConCorpus,
  limpiar,
} from './ayuda/construir.js';
import { MAX_CARACTERES_CRITERIO, MIN_CITAS_POR_COLECCION } from '../../src/lib/umbrales.ts';

/**
 * Historia 12.2 — la Colección sobre un proyecto construido de verdad.
 *
 * Lo que la matriz pura no puede demostrar: que el esquema es **puerta** —un fichero de
 * Colección sin nombre o sin criterio rompe el build— y, sobre todo, que la lista de
 * miembros es blanda **en la construcción**. Mover una Cita a `corpus/_revision/` con la
 * Colección declarándola es el caso que una referencia dura de esquema convertiría en un
 * build en rojo, y aquí se comprueba que sigue en verde.
 */

const aLimpiar: string[] = [];
afterAll(async () => {
  await Promise.all(aLimpiar.map(limpiar));
});

/**
 * Sonda: enumera las Colecciones **tal y como lo hará la Página de Colección de la 12.3**.
 *
 * Pide el conjunto publicable y recorre `conjunto.colecciones` y nada más. No llama a
 * `resolverColeccion` ni a `coleccionesPublicadas`, porque no le hace falta: lo que recibe
 * ya viene resuelto y filtrado por su umbral. Un fixture es documentación viva de cómo se
 * usa una API, y la versión anterior de esta sonda enseñaba el atajo —resolver la lista
 * declarada por su cuenta— que se saltaba el umbral entero.
 */
const SONDA = `---
import { conjuntoPublicable } from '../lib/publicado.ts';
const conjunto = await conjuntoPublicable();
---
<!doctype html>
<html lang="es"><head><meta charset="utf-8" /><title>Sonda</title></head>
<body>
  <ul id="publicadas">
    {conjunto.colecciones.map((c) => (
      <li data-coleccion={c.slug} data-declarados={c.declarados} data-resueltos={c.citas.length}>
        {c.nombre}
        {c.citas.map((cita) => <span data-miembro={cita.slug}>{cita.slug}</span>)}
      </li>
    ))}
  </ul>
</body></html>
`;

/** Una Cita publicable por índice, con texto propio para que el cotejo tenga qué cotejar. */
function citaNumerada(i: number): [string, string] {
  const slug = `seneca-frase-numero-${i}`;
  return [
    `citas/seneca--frase-${i}.md`,
    citaValida({ slug, texto: `Frase número ${i} de Séneca, escrita para esta prueba.` }),
  ];
}

const CORPUS_BASE = {
  'autores/seneca.yml': AUTOR_VALIDO,
  'temas/el-tiempo.yml': TEMA_VALIDO,
};

/** n Citas publicadas y sus slugs, listos para declararse como miembros. */
function nCitasPublicadas(n: number): { ficheros: Record<string, string>; slugs: string[] } {
  const ficheros: Record<string, string> = {};
  const slugs: string[] = [];
  for (let i = 0; i < n; i += 1) {
    const [ruta, contenido] = citaNumerada(i);
    ficheros[ruta] = contenido;
    slugs.push(`seneca-frase-numero-${i}`);
  }
  return { ficheros, slugs };
}

async function construir(corpus: Record<string, string>) {
  const resultado = await construirConCorpus(corpus, { paginas: { 'sonda.astro': SONDA } });
  aLimpiar.push(resultado.proyecto);
  return resultado;
}

const leerSonda = (proyecto: string) => readFile(join(proyecto, 'dist', 'sonda.html'), 'utf8');

describe('Historia 12.2 — la pertenencia se resuelve al construir', () => {
  it('una Colección con miembros publicados resuelve, y ninguna Cita se ha modificado', async () => {
    const { ficheros, slugs } = nCitasPublicadas(MIN_CITAS_POR_COLECCION);
    const { codigo, proyecto } = await construir({
      ...CORPUS_BASE,
      ...ficheros,
      'colecciones/frases-cortas.yml': coleccionValida({ miembros: slugs }),
    });
    expect(codigo).toBe(0);

    const sonda = await leerSonda(proyecto);
    expect(sonda).toContain('data-coleccion="frases-cortas"');
    expect(sonda).toContain(`data-resueltos="${MIN_CITAS_POR_COLECCION}"`);
    for (const slug of slugs) expect(sonda).toContain(`data-miembro="${slug}"`);

    // Y el fichero de la Cita sigue siendo el que se escribió: pertenecer a una Colección
    // no le añade nada. Se compara byte a byte contra el fixture.
    const [ruta, contenido] = citaNumerada(0);
    expect(await readFile(join(proyecto, 'corpus', ruta), 'utf8')).toBe(contenido);
  });
});

describe('Historia 12.2 — retirar una Cita a revisión no rompe el build', () => {
  it('el build sigue en verde y la Cita sale de la Colección', async () => {
    /*
     * El caso que una referencia dura de esquema convertiría en build en rojo. El fichero
     * de Colección es el mismo que si nadie hubiera retirado nada: lo único que cambia es
     * que una de las Citas declaradas está en `_revision/` en vez de en `citas/`.
     *
     * Se declara una por encima del umbral para que la Colección **siga publicada** después
     * de la retirada: así se ve lo que la historia promete —la Cita sale sin dejar hueco ni
     * enlace roto— y no solo que el build no se cae.
     */
    const declarados = MIN_CITAS_POR_COLECCION + 1;
    const { ficheros, slugs } = nCitasPublicadas(declarados);
    const [rutaRetirada, contenidoRetirado] = citaNumerada(0);
    const restantes = { ...ficheros };
    delete restantes[rutaRetirada];

    const { codigo, salida, proyecto } = await construir({
      ...CORPUS_BASE,
      ...restantes,
      '_revision/seneca--frase-0.md': contenidoRetirado,
      'colecciones/frases-cortas.yml': coleccionValida({ miembros: slugs }),
    });

    expect(codigo).toBe(0);
    expect(salida).not.toMatch(/does not match collection schema/);
    // Ni el mensaje de referencia rota de Astro, que es como se manifestaría un
    // `reference('citas')` puesto por descuido en `miembros`.
    expect(salida).not.toMatch(/does not exist|Reference to .* invalid/i);

    const sonda = await leerSonda(proyecto);
    expect(sonda).toContain('data-coleccion="frases-cortas"');
    expect(sonda).not.toContain('data-miembro="seneca-frase-numero-0"');
    expect(sonda).toContain(`data-declarados="${declarados}"`);
    expect(sonda).toContain(`data-resueltos="${MIN_CITAS_POR_COLECCION}"`);
  });

  it('retirar por debajo del umbral la despublica, y tampoco rompe', async () => {
    const { ficheros, slugs } = nCitasPublicadas(MIN_CITAS_POR_COLECCION);
    const [rutaRetirada, contenidoRetirado] = citaNumerada(0);
    const restantes = { ...ficheros };
    delete restantes[rutaRetirada];

    const { codigo, proyecto } = await construir({
      ...CORPUS_BASE,
      ...restantes,
      '_revision/seneca--frase-0.md': contenidoRetirado,
      'colecciones/frases-cortas.yml': coleccionValida({ miembros: slugs }),
    });

    expect(codigo).toBe(0);
    expect(await leerSonda(proyecto)).not.toContain('data-coleccion="frases-cortas"');
  });

  it('un miembro declarado que no existe tampoco rompe, y el desajuste se anuncia', async () => {
    const { ficheros, slugs } = nCitasPublicadas(3);
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      ...ficheros,
      'colecciones/frases-cortas.yml': coleccionValida({
        miembros: [...slugs, 'seneca-slug-con-erratta'],
      }),
    });

    expect(codigo).toBe(0);
    // Lo blando no debe tapar erratas: no rompe, pero se cuenta y se dice cuál.
    expect(salida).toMatch(/sin resolver/);
    expect(salida).toContain('seneca-slug-con-erratta');
  });

  it('sin desajustes la construcción no dice nada de Colecciones', async () => {
    const { ficheros, slugs } = nCitasPublicadas(3);
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      ...ficheros,
      'colecciones/frases-cortas.yml': coleccionValida({ miembros: slugs }),
    });
    expect(codigo).toBe(0);
    expect(salida).not.toMatch(/sin resolver/);
  });
});

describe('Historia 12.2 — el umbral se aplica al recuento resuelto, al construir', () => {
  it('una Colección que declara muchos y resuelve pocos no queda publicada', async () => {
    const { ficheros, slugs } = nCitasPublicadas(2);
    const declarados = [
      ...slugs,
      ...Array.from({ length: 18 }, (_, i) => `seneca-en-revision-${i}`),
    ];

    const { codigo, salida, proyecto } = await construir({
      ...CORPUS_BASE,
      ...ficheros,
      'colecciones/frases-cortas.yml': coleccionValida({ miembros: declarados }),
    });
    expect(codigo).toBe(0);

    // Declara veinte y resuelve dos: manda el resuelto y no se publica. El conjunto
    // publicable ya no reparte la lista declarada, así que la sonda no puede enseñarla —y
    // esa es justamente la puerta—; los dos recuentos se leen del aviso del build.
    expect(salida).toContain('frases-cortas: 2 de 20');
    expect(await leerSonda(proyecto)).not.toContain('data-coleccion="frases-cortas"');
  });

  /*
   * Aquí hubo una prueba que leía el `dist/sitemap-0.xml` y comprobaba que no nombrase la
   * Colección. Cuando se escribió **no podía fallar**: no existía la Página de Colección, así
   * que el sitemap no la habría nombrado ni con el umbral a cero. Se retiró por eso.
   *
   * Actualizado en la Historia 12.3, que sí construyó la superficie: sitemap, chips de la
   * portada y descubrimiento ya existen y ya se verifican, sobre un sitio construido, en
   * `tests/unit/coleccion-pagina.test.ts` —«el umbral se aplica en un solo sitio»—. Lo que
   * esta prueba de aquí arriba sigue cubriendo, y sigue siendo suyo, es el plano anterior:
   * que el conjunto publicable no reparta una Colección bajo umbral, que es de donde
   * cuelgan las tres.
   */
});

describe('Historia 12.2 — el esquema de Colección es una puerta del build', () => {
  it('una Colección sin nombre rompe el build, nombrando fichero y regla', async () => {
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      'citas/seneca--el-tiempo.md': citaValida(),
      'colecciones/frases-cortas.yml': coleccionValida({ nombre: undefined }),
    });
    expect(codigo).not.toBe(0);
    expect(salida).toContain('frases-cortas');
    expect(salida).toMatch(/falta el nombre de la Colección/);
  });

  it('una Colección sin criterio rompe el build, nombrando fichero y regla', async () => {
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      'citas/seneca--el-tiempo.md': citaValida(),
      'colecciones/frases-cortas.yml': coleccionValida({ criterio: undefined }),
    });
    expect(codigo).not.toBe(0);
    expect(salida).toContain('frases-cortas');
    expect(salida).toMatch(/criterio de la Colección/);
  });

  it('un criterio más largo del que cabe en la descripción rompe el build — Historia 12.3', async () => {
    /*
     * El criterio se publica **literal** como `<meta name="description">` de la Página de
     * Colección, y NFR-12 prohíbe que la página lo recorte. Sin puerta, un criterio largo
     * salía entero en la página y cortado en los resultados de búsqueda sin que nadie lo
     * dijera. La puerta está donde el editor puede arreglarlo.
     */
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      'citas/seneca--el-tiempo.md': citaValida(),
      'colecciones/frases-cortas.yml': coleccionValida({
        criterio: 'a'.repeat(MAX_CARACTERES_CRITERIO + 1),
      }),
    });
    expect(codigo).not.toBe(0);
    expect(salida).toContain('frases-cortas');
    expect(salida).toContain(String(MAX_CARACTERES_CRITERIO));
    expect(salida).toMatch(/Regla incumplida/);
  });

  it('un campo mal tecleado rompe el build en vez de perderse en silencio', async () => {
    // `miembros` tiene valor por omisión, así que un `miembos:` descartado dejaría una
    // Colección de cero miembros sin que nada lo dijera: ni el build, ni el recuento de
    // desajustes, que vería declarado y resuelto a cero.
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      'citas/seneca--el-tiempo.md': citaValida(),
      'colecciones/frases-cortas.yml':
        'nombre: "Frases cortas"\ncriterio: "Una razón."\nmiembos:\n  - seneca-x\n',
    });
    expect(codigo).not.toBe(0);
    expect(salida).toMatch(/no reconoce/);
    expect(salida).toContain('miembos');
  });

  it('«miembros:» sin nada debajo rompe el build con la regla, no con un error de tipo', async () => {
    /*
     * YAML lee eso como `null`, y `.default([])` solo actúa sobre `undefined`: sin mensaje
     * propio, el editor recibía «Invalid input: expected array, received null». Es el mismo
     * defecto que `procedencia:` ya tiene cerrado —ver puerta-de-admision.test.ts— y se
     * escribe en YAML crudo porque el fixture no puede producir esta forma.
     */
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      'citas/seneca--el-tiempo.md': citaValida(),
      'colecciones/frases-cortas.yml': 'nombre: "Frases cortas"\ncriterio: "Una razón."\nmiembros:\n',
    });
    expect(codigo).not.toBe(0);
    expect(salida).toMatch(/Regla incumplida/);
    expect(salida).toMatch(/«miembros» es una lista de slugs/);
    // Y no el error de tipo de la librería, que es lo que se estaba arreglando.
    expect(salida).not.toMatch(/expected array, received null/);
  });

  it('omitir «miembros» entero es válido: la Colección queda a cero y no se publica', async () => {
    // La otra mitad del contrato, y el único camino que recorre el `.default([])`. Sin esta
    // prueba, quitar el valor por omisión del esquema no rompería nada.
    const { codigo, proyecto } = await construir({
      ...CORPUS_BASE,
      'citas/seneca--el-tiempo.md': citaValida(),
      'colecciones/frases-cortas.yml': coleccionValida({ miembros: undefined }),
    });
    expect(codigo).toBe(0);

    expect(await leerSonda(proyecto)).not.toContain('data-coleccion="frases-cortas"');
  });

  it('un nombre de solo espacios rompe el build', async () => {
    // `.min(1)` daba por bueno un nombre en blanco: tiene longitud uno.
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      'citas/seneca--el-tiempo.md': citaValida(),
      'colecciones/frases-cortas.yml': coleccionValida({ nombre: '   ' }),
    });
    expect(codigo).not.toBe(0);
    expect(salida).toMatch(/no puede estar vacío ni ser solo espacios/);
  });

  it('un criterio de solo espacios rompe el build', async () => {
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      'citas/seneca--el-tiempo.md': citaValida(),
      'colecciones/frases-cortas.yml': coleccionValida({ criterio: ' ' }),
    });
    expect(codigo).not.toBe(0);
    expect(salida).toMatch(/criterio de la Colección no puede estar vacío ni ser solo espacios/);
  });

  it('un miembro que no es un slug rompe el build', async () => {
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      'citas/seneca--el-tiempo.md': citaValida(),
      'colecciones/frases-cortas.yml': coleccionValida({ miembros: ['Séneca El Tiempo'] }),
    });
    expect(codigo).not.toBe(0);
    expect(salida).toMatch(/miembro de una Colección es el slug de una Cita/);
  });

  it('dos ficheros con el mismo identificador rompen el build, nombrando los dos', async () => {
    /*
     * `a.yml` y `a.yaml` derivan el mismo identificador. El cargador de Astro se queda con
     * uno y el otro desaparece sin una línea en la construcción: el editor cura una
     * Colección que el sitio no publica. Ningún esquema puede ver esto, porque cada
     * fichero es válido por separado.
     */
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      'citas/seneca--el-tiempo.md': citaValida(),
      'colecciones/frases-cortas.yml': coleccionValida({ nombre: 'Una' }),
      'colecciones/frases-cortas.yaml': coleccionValida({ nombre: 'Otra' }),
    });
    expect(codigo).not.toBe(0);
    expect(salida).toContain('corpus/colecciones/frases-cortas.yml');
    expect(salida).toContain('corpus/colecciones/frases-cortas.yaml');
  });

  it('una Colección en un subdirectorio rompe el build', async () => {
    // La otra mitad de «una sola regla»: el slug es la ruta sin extensión, así que en un
    // subdirectorio llevaría una barra dentro y partiría /coleccion/{slug}.
    const { codigo, salida } = await construir({
      ...CORPUS_BASE,
      'citas/seneca--el-tiempo.md': citaValida(),
      'colecciones/sub/frases-cortas.yml': coleccionValida(),
    });
    expect(codigo).not.toBe(0);
    expect(salida).toContain('corpus/colecciones/sub/frases-cortas.yml');
    expect(salida).toMatch(/sin subdirectorios/);
  });

  it('un corpus sin ninguna Colección construye, y no hereda las de otra construcción', async () => {
    // El estado en el que se versiona el repositorio: `corpus/colecciones/` existe y está
    // vacío hasta que el dueño del Corpus cure la primera.
    //
    // Las dos construcciones seguidas no son adorno. El cargador de globs de Astro, cuando
    // no encuentra ningún fichero, avisa y **vuelve sin vaciar el almacén de contenido**;
    // con el almacén compartido que tenían los proyectos temporales, el segundo build
    // heredaba la Colección del primero y el `npm run build` de la raíz anunciaba una
    // Colección que no está en `corpus/`. Ver `enlazarDependencias` en el andamio.
    //
    // La primera construcción declara por encima del umbral para que la Colección llegue
    // de verdad a la sonda: si no se publicara, la segunda comprobación pasaría por no
    // haber nada que heredar.
    const { ficheros, slugs } = nCitasPublicadas(MIN_CITAS_POR_COLECCION);
    const conColeccion = await construir({
      ...CORPUS_BASE,
      ...ficheros,
      'colecciones/frases-cortas.yml': coleccionValida({ miembros: slugs }),
    });
    expect(conColeccion.codigo).toBe(0);
    expect(await leerSonda(conColeccion.proyecto)).toContain('data-coleccion="frases-cortas"');

    const sinColeccion = await construir({
      ...CORPUS_BASE,
      'citas/seneca--el-tiempo.md': citaValida(),
    });
    expect(sinColeccion.codigo).toBe(0);
    expect(await leerSonda(sinColeccion.proyecto)).not.toContain('frases-cortas');
  });
});
