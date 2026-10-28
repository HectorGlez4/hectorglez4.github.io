import { describe, expect, it } from 'vitest';
import {
  grafoDelModelo,
  superficiesInalcanzables,
  temasBajoUmbralDe,
  type Cita,
  type ConjuntoPublicable,
  type ColeccionPublicada,
} from '../../src/lib/publicado.ts';
import type { ObraResuelta } from '../../src/lib/obras.ts';
import { CITAS_POR_PAGINA, MIN_CITAS_POR_TEMA } from '../../src/lib/umbrales.ts';
import { SITIO } from '../../src/lib/dominio.ts';
import {
  aristasQueFaltan,
  detalleDeAlcance,
  enlacesInternos,
  grafoDeDist,
  informeDeAlcance,
  lineaDeFuera,
  motivoSinTemaPublicado,
  motivosDeFueraDeAlcance,
  rompeElBuild,
  rutaInterna,
  temaPublicadoConLaPasada,
  titularDeAlcance,
  veredictoDeAlcance,
} from '../../tools/lib/alcance.ts';

/**
 * Historia 26.8 — NFR-5 con puerta, sobre lo puro: el grafo del modelo, el del HTML construido
 * sin lo que rota con la jornada, la contención, el veredicto con el Tema bajo umbral y la regla
 * de Tema publicado con la pasada. Los builds de verdad están en `alcance-construido.test.ts`.
 */

const CABECERA = ['/', '/autores', '/obras', '/buscar'];

function obra(nombre: string, autor: string, recuento: number, titulo = nombre): ObraResuelta {
  return { nombre, autor, titulo, recuento, fuentes: [], edicionCotejada: false, temas: [] } as ObraResuelta;
}

function cita(slug: string, autor: string, temas: string[] = [], suObra?: ObraResuelta): Cita {
  return {
    slug,
    texto: `Texto de ${slug}.`,
    autor,
    temas,
    procedencia: {},
    aptaParaPortada: false,
    ...(suObra !== undefined ? { obra: suObra } : {}),
  } as Cita;
}

const numerada = (prefijo: string, n: number) => `${prefijo}-${String(n).padStart(3, '0')}`;

/**
 * Un conjunto con todas las familias: Séneca con 120 Citas (tres páginas) en una Obra de 60
 * (dos páginas), un Tema publicado de `MIN_CITAS_POR_TEMA`, otro por debajo, una Colección y un
 * segundo Autor con una Cita sin Tema ni Obra.
 */
function conjuntoDePrueba(): { conjunto: ConjuntoPublicable; porObra: Map<string, Cita[]> } {
  const cartas = obra('seneca--cartas', 'seneca', 60, 'Cartas');
  const citas: Cita[] = [];
  for (let n = 1; n <= 120; n += 1) {
    const temas = n <= MIN_CITAS_POR_TEMA ? ['el-tiempo'] : n <= MIN_CITAS_POR_TEMA + 3 ? ['la-ira'] : [];
    citas.push(cita(numerada('seneca', n), 'seneca', temas, n <= 60 ? cartas : undefined));
  }
  citas.push(cita('epicteto-uno', 'epicteto'));
  const coleccion = {
    slug: 'breves',
    nombre: 'Breves',
    criterio: 'Cortas.',
    citas: citas.slice(0, 3),
    declarados: 3,
    sinResolver: [],
  } as unknown as ColeccionPublicada;
  const conjunto: ConjuntoPublicable = {
    citas,
    autores: [
      { slug: 'seneca', nombre: 'Séneca', semblanza: '', añoFallecimiento: 65 },
      { slug: 'epicteto', nombre: 'Epicteto', semblanza: '', añoFallecimiento: 135 },
    ],
    temas: [
      { slug: 'el-tiempo', nombre: 'El tiempo' },
      { slug: 'la-ira', nombre: 'La ira' },
    ],
    colecciones: [coleccion],
  };
  // El orden del libro: al revés que el de slug, para que el tramo no sea el de la Página de Autor.
  const porObra = new Map([['seneca--cartas', citas.filter((c) => c.obra !== undefined).reverse()]]);
  return { conjunto, porObra };
}

describe('Historia 26.8 — el grafo del modelo', () => {
  const { conjunto, porObra } = conjuntoDePrueba();
  const grafo = grafoDelModelo(conjunto, porObra);
  const de = (ruta: string) => grafo.get(ruta) ?? [];

  it('la portada lleva a los Temas publicados y a las Colecciones, y no a los Autores', () => {
    expect(de('/')).toContain('/tema/el-tiempo');
    expect(de('/')).toContain('/coleccion/breves');
    expect(de('/')).not.toContain('/tema/la-ira');
    expect(de('/')).not.toContain('/autor/seneca');
    expect(de('/')).not.toContain('/autor/epicteto');
  });

  it('la cabecera de todo nodo lleva a la portada, los Directorios y la búsqueda', () => {
    expect(grafo.size).toBeGreaterThan(130);
    for (const [origen, destinos] of grafo) {
      for (const destino of CABECERA) expect(destinos, origen).toContain(destino);
    }
    // Las Citas son nodos del modelo, con su cabecera y nada más: ni Cita → Cita.
    expect(de('/cita/epicteto-uno').sort()).toEqual([...CABECERA].sort());
  });

  it('cada página de un listado enlaza a todas las demás, nunca a sí misma, y a su tramo de 50', () => {
    expect(CITAS_POR_PAGINA).toBe(50);
    const paginas = ['/autor/seneca', '/autor/seneca/2', '/autor/seneca/3'];
    for (const pagina of paginas) {
      for (const otra of paginas) {
        if (otra === pagina) expect(de(pagina)).not.toContain(otra);
        else expect(de(pagina), pagina).toContain(otra);
      }
    }
    expect(grafo.has('/autor/seneca/4')).toBe(false);
    // Tramos por slug, como `citasDeAutor`.
    expect(de('/autor/seneca')).toContain('/cita/seneca-001');
    expect(de('/autor/seneca')).toContain('/cita/seneca-050');
    expect(de('/autor/seneca')).not.toContain('/cita/seneca-051');
    expect(de('/autor/seneca/2')).toContain('/cita/seneca-051');
    expect(de('/autor/seneca/3')).toContain('/cita/seneca-120');
    expect(de('/autor/seneca/3').filter((r) => r.startsWith('/cita/'))).toHaveLength(20);
  });

  it('la Obra pagina en el orden que recibe, no por slug', () => {
    expect(de('/obra/seneca/cartas')).toContain('/cita/seneca-060');
    expect(de('/obra/seneca/cartas')).toContain('/obra/seneca/cartas/2');
    expect(de('/obra/seneca/cartas/2')).toContain('/cita/seneca-001');
    expect(de('/obra/seneca/cartas')).not.toContain('/cita/seneca-001');
  });

  it('la página 1 de un Autor lleva a sus Obras, y las demás no', () => {
    expect(de('/autor/seneca')).toContain('/obra/seneca/cartas');
    expect(de('/autor/seneca/2')).not.toContain('/obra/seneca/cartas');
  });

  it('los Directorios llevan a todo Autor y a toda Obra publicados', () => {
    expect(de('/autores')).toEqual(expect.arrayContaining(['/autor/seneca', '/autor/epicteto']));
    expect(de('/obras')).toContain('/obra/seneca/cartas');
    expect(de('/obras')).not.toContain('/obra/seneca/cartas/2');
  });

  it('un Tema publicado y una Colección pagina igual que un Autor', () => {
    expect(de('/tema/el-tiempo').filter((r) => r.startsWith('/cita/'))).toHaveLength(MIN_CITAS_POR_TEMA);
    expect(grafo.has('/tema/la-ira')).toBe(false);
    expect(de('/coleccion/breves')).toEqual(expect.arrayContaining(['/cita/seneca-001', '/cita/seneca-003']));
  });

  it('en el modelo, lo de la página 2 de su Autor sin Tema ni Obra en página 1 queda fuera', () => {
    const publicadas = conjunto.citas.map((c) => `/cita/${c.slug}`);
    const fuera = superficiesInalcanzables(publicadas, grafo);
    // Las de la página 1 (por Autor o por Obra, que pinta la 60…11) se alcanzan; las de la 2 y 3
    // que no están en la página 1 de su Obra ni en un Tema publicado, no.
    expect(fuera).toContain('/cita/seneca-100');
    expect(fuera).not.toContain('/cita/seneca-001');
    expect(fuera).not.toContain('/cita/seneca-055');
    expect(fuera).not.toContain('/cita/epicteto-uno');
  });
});

describe('Historia 26.8 — los Temas bajo umbral', () => {
  it('nombra los que la Cita declara y no se publican, con su recuento, en su orden', () => {
    const { conjunto } = conjuntoDePrueba();
    const una = cita('x', 'seneca', ['la-ira', 'el-tiempo', 'inexistente']);
    expect(temasBajoUmbralDe(una, conjunto.citas, conjunto.temas)).toEqual([
      { slug: 'la-ira', nombre: 'La ira', citas: 3 },
      { slug: 'inexistente', nombre: 'inexistente', citas: 0 },
    ]);
  });
});

describe('Historia 26.8 — los enlaces de una página construida', () => {
  const host = new URL(SITIO).host;

  it('cuenta los internos, de raíz relativa o del host, sin cadena de consulta ni ancla', () => {
    const html = [
      '<html><body><main>',
      '<a href="/cita/una/">a</a>',
      `<a href="https://${host}/autor/seneca/?de=x#arriba">b</a>`,
      '<a href="https://otro.example/cita/dos/">c</a>',
      '<a href="#contenido">d</a>',
      '<a href="mailto:x@example.org">e</a>',
      '<a>sin href</a>',
      '<link href="/cita/no-es-enlace/">',
      '</main></body></html>',
    ].join('');
    expect(enlacesInternos(html).sort()).toEqual(['/autor/seneca', '/cita/una']);
    expect(rutaInterna('/')).toBe('/');
    expect(rutaInterna('//otro.example/x')).toBeUndefined();
  });

  it('salta el subárbol de data-jornada, <template> y <noscript>, también anidado', () => {
    const html = [
      '<main>',
      '<section class="del-dia" data-jornada><div><p><a href="/cita/del-dia/">Ver esta cita</a></p></div></section>',
      '<template><a href="/cita/plantilla/">x</a></template>',
      '<noscript><p><a href="/cita/sin-guion/">x</a></p></noscript>',
      '<div data-jornada="2026-10-28"><ul><li><a href="/cita/con-valor/">x</a></li></ul></div>',
      '<p><a href="/cita/visible/">x</a></p>',
      '</main>',
    ].join('');
    expect(enlacesInternos(html)).toEqual(['/cita/visible']);
  });

  it('el grafo de dist/ va por ruta normalizada', () => {
    const grafo = grafoDeDist([{ ruta: '/autor/seneca/', html: '<a href="/cita/una/">x</a>' }]);
    expect([...grafo]).toEqual([['/autor/seneca', ['/cita/una']]]);
  });
});

describe('Historia 26.8 — contención y veredicto', () => {
  it('las aristas del modelo que faltan se nombran como «origen → destino»', () => {
    const modelo = new Map([
      ['/', ['/tema/a', '/autores']],
      ['/tema/a', ['/tema/a/2']],
    ]);
    const construido = new Map([['/', ['/tema/a', '/autores', '/autor/x']]]);
    expect(aristasQueFaltan(modelo, construido)).toEqual(['/tema/a → /tema/a/2']);
  });

  it('una Cita fuera rompe nombrando su Tema bajo umbral y su recuento', () => {
    const { conjunto, porObra } = conjuntoDePrueba();
    const modelo = grafoDelModelo(conjunto, porObra);
    // El sitio construido es exactamente el modelo: sin la lista de Autores de la portada.
    const veredicto = veredictoDeAlcance(conjunto, modelo, modelo);
    expect(rompeElBuild(veredicto)).toBe(true);
    expect(veredicto.aristasQueFaltan).toEqual([]);
    const fuera = veredicto.fuera.map((f) => f.ruta);
    expect(fuera).toContain('/cita/seneca-100');
    // La 16.ª, la 17.ª y la 18.ª declaran «La ira» (3 Citas), pero están en la página 1 de Séneca.
    expect(veredicto.fuera.filter((f) => f.temas?.some((t) => t.slug === 'la-ira'))).toEqual([]);
    const detalle = detalleDeAlcance(veredicto).join('\n');
    expect(detalle).toMatch(/\/cita\/seneca-100 — no declara ningún Tema/);
    expect(titularDeAlcance(veredicto)).toMatch(new RegExp(`^NFR-5: ${veredicto.fuera.length} superficie`));
    expect(
      lineaDeFuera({ ruta: '/cita/x', temas: [{ slug: 'la-ira', nombre: 'La ira', citas: 14 }], declarados: 1 }),
    ).toBe(`  · /cita/x — su Tema «La ira» (la-ira) tiene 14 Citas, por debajo de MIN_CITAS_POR_TEMA (${MIN_CITAS_POR_TEMA})`);
  });

  it('con la lista de Autores de la portada no rompe, y la línea no dice ninguna fecha', () => {
    const { conjunto, porObra } = conjuntoDePrueba();
    const modelo = grafoDelModelo(conjunto, porObra);
    const construido = new Map([...modelo].map(([o, d]) => [o, [...d]]));
    construido.get('/')!.push('/autor/seneca', '/autor/epicteto');
    const veredicto = veredictoDeAlcance(conjunto, modelo, construido);
    expect(rompeElBuild(veredicto)).toBe(false);
    expect(informeDeAlcance(veredicto)).toMatch(/^NFR-5: \d+ superficies publicadas, todas a 3 saltos o menos/);
    expect(informeDeAlcance(veredicto)).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });
});

describe('Historia 26.8 — Tema publicado con la pasada', () => {
  const temas = [
    { slug: 'el-tiempo', nombre: 'El tiempo' },
    { slug: 'la-ira', nombre: 'La ira' },
  ];
  const publicadas = Array.from({ length: MIN_CITAS_POR_TEMA - 1 }, () => ({ temas: ['el-tiempo'] }));

  it('la 15.ª de un Tema se admite, y varias que juntas llegan también', () => {
    expect([...temaPublicadoConLaPasada(publicadas, [{ clave: 'a', temas: ['el-tiempo'] }], temas).admitidas]).toEqual(['a']);
    const ira = Array.from({ length: MIN_CITAS_POR_TEMA }, (_, i) => ({ clave: `ira-${i}`, temas: ['la-ira'] }));
    expect(temaPublicadoConLaPasada([], ira, temas).admitidas.size).toBe(MIN_CITAS_POR_TEMA);
  });

  it('sin Tema, o con Temas que no llegan, no; y el punto fijo arrastra a las que dependían de ella', () => {
    const pasada = [
      { clave: 'sin-tema', temas: [] as string[] },
      // 14 de «La ira»: con la de abajo serían 15, pero esa no se publica… porque es de las 14.
      ...Array.from({ length: MIN_CITAS_POR_TEMA - 1 }, (_, i) => ({ clave: `ira-${i}`, temas: ['la-ira'] })),
    ];
    const { admitidas, rechazadas } = temaPublicadoConLaPasada([], pasada, temas);
    expect(admitidas.size).toBe(0);
    expect(rechazadas).toHaveLength(MIN_CITAS_POR_TEMA);
    expect(rechazadas[0]).toEqual({ clave: 'sin-tema', temas: [] });
    // Con la pasada entera: 14, y ni así llega.
    expect(rechazadas[1].temas).toEqual([{ slug: 'la-ira', nombre: 'La ira', citas: MIN_CITAS_POR_TEMA - 1 }]);
    expect(motivoSinTemaPublicado(rechazadas[0].temas)).toMatch(/no declara ningún Tema/);
    expect(motivoSinTemaPublicado([{ slug: 'la-ira', nombre: 'La ira', citas: 14 }])).toMatch(
      /«La ira» \(la-ira\) tendría 14 Citas/,
    );
  });

  it('dos de la pasada que juntas completan el Tema con las publicadas se admiten las dos', () => {
    // 13 publicadas de «el-tiempo»: una sola de la pasada lo deja en 14; las dos, en 15.
    const trece = publicadas.slice(1);
    const sola = temaPublicadoConLaPasada(trece, [{ clave: 'a', temas: ['el-tiempo'] }], temas);
    expect(sola.admitidas.size).toBe(0);
    expect(sola.rechazadas[0].temas).toEqual([{ slug: 'el-tiempo', nombre: 'El tiempo', citas: 14 }]);
    const juntas = temaPublicadoConLaPasada(
      trece,
      [
        { clave: 'a', temas: ['el-tiempo'] },
        { clave: 'b', temas: ['el-tiempo', 'la-ira'] },
      ],
      temas,
    );
    expect([...juntas.admitidas].sort()).toEqual(['a', 'b']);
  });

  it('el parte de una orden que retira nombra cada Cita y su Tema con recuento', () => {
    const motivos = motivosDeFueraDeAlcance([
      { slug: 'x', ruta: '/cita/x/', temas: [{ slug: 'la-ira', nombre: 'La ira', citas: 14 }], declarados: 1 },
    ]);
    expect(motivos[0]).toMatch(/dejaría 1 Cita a más de 3 saltos/);
    expect(motivos[1]).toMatch(/\/cita\/x\/ — su Tema «La ira» \(la-ira\) tiene 14 Citas/);
    expect(motivos.at(-1)).toMatch(/No se ha escrito ni movido nada/);
  });
});
