import { describe, expect, it } from 'vitest';
import { seleccionDeColeccion } from '../../src/lib/coleccionEnPieza.ts';
import { MINIMO_DE_CITAS } from '../../src/lib/pieza.ts';
import {
  coleccionesPublicadas,
  resolverColeccion,
  type Autor,
  type Cita,
  type ColeccionPublicada,
} from '../../src/lib/publicado.ts';
import { SUPERFICIES, rutaDeColeccion, rutaNormalizada } from '../../src/lib/superficies.ts';
import { MAX_CARACTERES_IMAGEN, MIN_CITAS_POR_COLECCION } from '../../src/lib/umbrales.ts';

/**
 * Historia 13.3 — qué Citas de una Colección entran en su Pieza, sobre lo puro.
 *
 * Lo que se mide aquí es la selección: que el orden sea el declarado, que lo excluido salga
 * **con su motivo** y que el umbral esté cerrado en el compilador y no en un `if`. El porqué de
 * las dos cosas está escrito una sola vez, en la cabecera de `src/lib/coleccionEnPieza.ts`. Lo
 * que se mide ejecutando la orden está en `pieza-coleccion-cli.test.ts`.
 */

const SENECA: Autor = {
  slug: 'seneca',
  nombre: 'Séneca',
  semblanza: 'Filósofo estoico.',
  añoFallecimiento: 65,
};

const autores = new Map<string, Autor>([['seneca', SENECA]]);

const cita = (slug: string, texto: string, autor = 'seneca'): Cita => ({
  slug,
  texto,
  autor,
  temas: [],
  procedencia: { obra: 'Sobre la brevedad de la vida', año: 49 },
  aptaParaPortada: false,
});

const breve = (i: number): Cita =>
  cita(`c${i}`, `Fragmento número ${i} sobre la brevedad de la vida.`);

/** Las `n` Citas breves que hacen falta para que una Colección de prueba se publique. */
const nBreves = (n: number = MIN_CITAS_POR_COLECCION): Cita[] =>
  Array.from({ length: n }, (_, i) => breve(i));

/** Una frase de la longitud pedida, en palabras de verdad. */
function frase(caracteres: number): string {
  const base =
    'La vida no es la que uno vivió, sino la que uno recuerda y cómo la recuerda para ' +
    'contarla, y por eso quien escribe su memoria escribe también su olvido. ';
  return base.repeat(Math.ceil(caracteres / base.length)).slice(0, caracteres).trim();
}

/**
 * Un nombre que se reparte en más de una línea, y otro que se come el lienzo entero.
 *
 * El segundo son palabras cortas a propósito: `palabrasDelTituloQueDesbordan` no ve nada
 * —ninguna palabra suelta se sale por el lado— y sin embargo el bloque del título consume todo
 * el alto útil. Es el caso que producía «entran 0 de 15» culpando a las Citas.
 */
const NOMBRE_QUE_SE_COME_EL_LIENZO = Array.from({ length: 120 }, () => 'de la vida').join(' ');

/**
 * Una Colección publicada de verdad: por el único camino que produce una.
 *
 * No hay atajo, y es el punto de la historia: `coleccionesPublicadas` es el único sitio del
 * proyecto donde se aplica `MIN_CITAS_POR_COLECCION`, así que un fixture que no llegue al
 * umbral no puede fabricar el tipo ni con un `as`.
 */
function publicada(citas: Cita[], miembros: string[] = citas.map((c) => c.slug)): ColeccionPublicada {
  const [coleccion] = coleccionesPublicadas(
    [
      {
        slug: 'frases-cortas',
        nombre: 'Frases cortas para reflexionar',
        criterio: 'Citas de una sola frase que se sostienen fuera de su obra.',
        miembros,
      },
    ],
    citas,
  );
  expect(coleccion, 'el fixture no llega al umbral: no hay Colección publicada').toBeDefined();
  return coleccion;
}

describe('Historia 13.3 — el umbral está cerrado en el compilador', () => {
  it('una Colección resuelta sin publicar no cabe donde se espera una publicada', () => {
    /*
     * Esta es la puerta, y la vigila `npx astro check`. `resolverColeccion` no aplica umbral,
     * así que su salida no puede componer ninguna Pieza. El `@ts-expect-error` es la
     * comprobación: si alguien relajara la firma, la línea dejaría de tener error y la
     * comprobación de tipos fallaría por un `@ts-expect-error` sin usar.
     *
     * Y es todo lo que hace falta para el criterio «una Colección por debajo de su umbral no
     * produce Pieza»: no hay ningún `if` que mantener sincronizado con el de `publicado.ts`.
     */
    const citas = nBreves();
    const resuelta = resolverColeccion(
      { slug: 'frases-cortas', nombre: 'Frases cortas', criterio: 'Un criterio.', miembros: [] },
      citas,
    );
    // @ts-expect-error — nadie ha mirado el umbral: esto no es una Colección publicada.
    const seleccion = seleccionDeColeccion(resuelta, autores);
    expect(seleccion.titulo).toBe('Frases cortas');
  });

  it('lo que devuelve el filtro sí encaja, y trae el nombre como título', () => {
    const seleccion = seleccionDeColeccion(publicada(nBreves()), autores);
    expect(seleccion.titulo).toBe('Frases cortas para reflexionar');
  });
});

describe('Historia 13.3 — el orden es el declarado en la Colección', () => {
  it('entran las primeras del orden declarado, no las primeras por slug', () => {
    /*
     * El orden declarado es curación de Héctor y `resolverColeccion` lo preserva a propósito.
     * Se declara al revés del orden del corpus para que ordenar por slug —que es lo que hace
     * un Tema— dé un resultado distinto y la prueba lo note.
     */
    const citas = nBreves();
    const alReves = [...citas].reverse().map((c) => c.slug);
    const seleccion = seleccionDeColeccion(publicada(citas, alReves), autores);

    expect(seleccion.citas.length).toBeGreaterThanOrEqual(MINIMO_DE_CITAS);
    expect(seleccion.citas.map((c) => c.slug)).toEqual(
      alReves.slice(0, seleccion.citas.length),
    );
  });

  it('quince Citas no caben en 1080, y las que sobran se dicen', () => {
    const citas = nBreves();
    const seleccion = seleccionDeColeccion(publicada(citas), autores);

    expect(seleccion.citas.length).toBeLessThan(citas.length);
    expect(seleccion.citas.length + seleccion.fuera.length).toBe(citas.length);
    // Cada exclusión con su motivo: excluir sin decirlo sería perder.
    for (const fuera of seleccion.fuera) expect(fuera.motivo).toMatch(/no cabe en el lienzo/);
  });

  it('la lista de excluidas sale en el orden declarado, no por motivo', () => {
    /*
     * Quien lee la salida está mirando su fichero de Colección. Una lista que salta de la
     * tercera a la décima y vuelve a la quinta le obliga a reordenarla de cabeza.
     */
    const citas = [...nBreves(), cita('larga', frase(MAX_CARACTERES_IMAGEN + 40))];
    const miembros = citas.map((c) => c.slug);
    // La larga se declara la primera: por motivo saldría después de las que no caben.
    const seleccion = seleccionDeColeccion(publicada(citas, ['larga', ...miembros.slice(0, -1)]), autores);

    expect(seleccion.fuera[0].slug).toBe('larga');
    const posicion = new Map(['larga', ...miembros.slice(0, -1)].map((s, i) => [s, i]));
    const posiciones = seleccion.fuera.map((f) => posicion.get(f.slug)!);
    expect(posiciones).toEqual([...posiciones].sort((a, b) => a - b));
  });
});

describe('Historia 13.3 — se excluye, pero se dice con su motivo', () => {
  it('una Cita que pasa del corte de FR-10 queda fuera nombrando la regla', () => {
    const larga = cita('larga', frase(MAX_CARACTERES_IMAGEN + 40));
    const citas = [larga, ...nBreves()];
    const seleccion = seleccionDeColeccion(publicada(citas), autores);

    expect(seleccion.citas.map((c) => c.slug)).not.toContain('larga');
    const dicha = seleccion.fuera.find((f) => f.slug === 'larga')!;
    expect(dicha.motivo).toContain('FR-10');
    expect(dicha.motivo).toContain(String(MAX_CARACTERES_IMAGEN));
  });

  it('una Cita cuyo Autor no está en el corpus queda fuera: no se anuncia sin atribución', () => {
    const huerfana = cita('huerfana', 'Nada hay más parecido a un hombre que otro hombre.', 'nadie');
    const seleccion = seleccionDeColeccion(publicada([huerfana, ...nBreves()]), autores);

    expect(seleccion.citas.map((c) => c.slug)).not.toContain('huerfana');
    expect(seleccion.fuera.find((f) => f.slug === 'huerfana')!.motivo).toContain('sin atribución');
  });

  it('un Autor cuya ficha no trae nombre queda fuera por la misma razón', () => {
    const sinNombre = new Map<string, Autor>([['seneca', { ...SENECA, nombre: '  ' }]]);
    const seleccion = seleccionDeColeccion(publicada(nBreves()), sinNombre);

    expect(seleccion.citas).toEqual([]);
    expect(seleccion.fuera).toHaveLength(MIN_CITAS_POR_COLECCION);
    expect(seleccion.fuera[0].motivo).toContain('no tiene nombre');
  });

  it('una palabra más ancha que el lienzo saca a su Cita, y la Pieza se compone con las demás', () => {
    /*
     * El reparto en líneas no parte palabras nunca, así que una indivisible se sale por el
     * lado y el rasterizado la publica **cortada** sin que nada falle. Aquí no se rechaza la
     * Pieza entera —a diferencia de la 13.2— porque a esta Cita no la nombró nadie: viene de
     * la pertenencia. Se excluye y se dice.
     */
    const imposible = cita('imposible', `Nada ${'a'.repeat(120)}`);
    const seleccion = seleccionDeColeccion(publicada([imposible, ...nBreves()]), autores);

    expect(seleccion.citas.map((c) => c.slug)).not.toContain('imposible');
    expect(seleccion.fuera.find((f) => f.slug === 'imposible')!.motivo).toContain('NFR-12');
    expect(seleccion.citas.length).toBeGreaterThanOrEqual(MINIMO_DE_CITAS);
  });

  it('la procedencia de cada Cita se compone con el dueño único de la atribución', () => {
    const seleccion = seleccionDeColeccion(publicada(nBreves()), autores);
    expect(seleccion.enPieza[0]).toEqual({
      texto: seleccion.citas[0].texto,
      autor: 'Séneca',
      procedencia: 'Sobre la brevedad de la vida, 49',
    });
  });
});

describe('Historia 13.3 — lo declarado que no resuelve también se dice', () => {
  it('los miembros con errata o en revisión salen en «sinResolver», no en la nada', () => {
    /*
     * La única exclusión que el curador **no** provocó, y la que más fácil se pierde: no la
     * elige la selección, no entra en `fuera` y ni siquiera cuenta para el recuento resuelto.
     * `resolverColeccion` ya los cuenta; callarlos aquí sería anunciar «N de sus 15» sobre una
     * Colección que declara veinte, y los cinco desaparecidos no existirían para nadie.
     */
    const citas = nBreves();
    const declarados = [...citas.map((c) => c.slug), 'seneca-con-errata', 'seneca-en-revision'];
    const seleccion = seleccionDeColeccion(publicada(citas, declarados), autores);

    expect(seleccion.sinResolver).toEqual(['seneca-con-errata', 'seneca-en-revision']);
    // Y no se confunden con lo excluido: son categorías distintas y se cuentan aparte.
    expect(seleccion.fuera.map((f) => f.slug)).not.toContain('seneca-con-errata');
  });

  it('sin desajuste, la lista está vacía y no hay nada que contar', () => {
    expect(seleccionDeColeccion(publicada(nBreves()), autores).sinResolver).toEqual([]);
  });
});

describe('Historia 13.3 — cuando el culpable es el nombre, se nombra al nombre', () => {
  it('un nombre que se come el lienzo se señala, en vez de culpar a las Citas', () => {
    const citas = nBreves();
    const seleccion = seleccionDeColeccion(
      publicada(citas, citas.map((c) => c.slug)),
      autores,
    );
    expect(seleccion.elTituloEstorba).toBe(false);

    const conNombreEnorme = coleccionesPublicadas(
      [
        {
          slug: 'frases-cortas',
          nombre: NOMBRE_QUE_SE_COME_EL_LIENZO,
          criterio: 'Un criterio.',
          miembros: citas.map((c) => c.slug),
        },
      ],
      citas,
    )[0];

    const imposible = seleccionDeColeccion(conNombreEnorme, autores);
    expect(imposible.citas).toEqual([]);
    expect(imposible.elTituloEstorba, 'el nombre es el culpable y nadie lo dice').toBe(true);
  });

  it('sin ninguna anterior, no se le dice a una Cita que no cabe «junto a las anteriores»', () => {
    const citas = nBreves();
    const conNombreEnorme = coleccionesPublicadas(
      [
        {
          slug: 'frases-cortas',
          nombre: NOMBRE_QUE_SE_COME_EL_LIENZO,
          criterio: 'Un criterio.',
          miembros: citas.map((c) => c.slug),
        },
      ],
      citas,
    )[0];

    const seleccion = seleccionDeColeccion(conNombreEnorme, autores);
    expect(seleccion.fuera).toHaveLength(citas.length);
    for (const fuera of seleccion.fuera) expect(fuera.motivo).not.toContain('anteriores');
  });
});

describe('Historia 13.3 — la ruta de destino sale de donde está declarada la familia', () => {
  it('lo que compone `rutaDeColeccion` es lo que reconoce la superficie declarada', () => {
    /*
     * El acoplamiento que la función existe para proteger, atado. Astro no comprueba que un
     * `href` interno case con ningún `getStaticPaths`, así que renombrar la página dejaría el
     * enlace de la Pieza apuntando a un 404 con el build entero en verde — y el 404 lo
     * encontraría un visitante semanas después de publicarla. Aquí se compara el constructor
     * con la declaración, que es el único par que no puede divergir sin que algo falle.
     */
    const familia = SUPERFICIES.find((s) => s.pagina.startsWith('coleccion/'));
    expect(familia, 'no hay familia de Colección declarada').toBeDefined();
    for (const slug of ['frases-cortas', '1984', 'a']) {
      // `reconoce` se escribe contra la ruta normalizada, que es la que no lleva barra final.
      expect(familia!.reconoce.test(rutaNormalizada(rutaDeColeccion(slug)))).toBe(true);
    }
    // Y es una ruta de producto: la Pieza enlaza a algo anunciable, no a una página de servicio.
    expect(familia!.caracter).toBe('producto');
  });
});
