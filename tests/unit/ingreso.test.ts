import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  MARCA_DE_INGRESO,
  MODELOS,
  MODELOS_VEDADOS_EN_LECTURA,
  SUPERFICIES_DE_LECTURA,
  SUPERFICIES_SIN_INGRESO,
  esPaginaDeObra,
  modeloDe,
  modelosEnRuta,
  modelosEncendidos,
  modelosMarcadosEn,
  revisarCensoDeIngreso,
  revisarDeclaracionDeIngreso,
  type Modelo,
} from '../../src/lib/ingreso.ts';
import { SUPERFICIES, type Superficie } from '../../src/lib/superficies.ts';
import {
  CONDICIONES_PARA_DONACIONES,
  SESIONES_PARA_AFILIACION,
  SESIONES_PARA_PRODUCTO_PROPIO,
  SESIONES_PARA_PUBLICIDAD,
} from '../../src/lib/umbrales.ts';

/**
 * Historia 14.1 — la tabla del dueño único del estado.
 *
 * Lo que se mide aquí es que el estado **no se pueda derivar de nada que no sea el módulo**:
 * ni del entorno, ni del disco, ni del receptor. Con los cuatro Modelos apagados casi todo
 * lo demás sale vacío, así que cada prueba que afirma un vacío trae al lado la que demuestra
 * que la comprobación sabe ver lo contrario.
 */

const FUENTE = readFileSync(resolve(import.meta.dirname, '../../src/lib/ingreso.ts'), 'utf8');

/**
 * El fichero sin sus comentarios, que es sobre lo que se juzga.
 *
 * La cabecera del módulo **nombra** lo que no hace —«no toca disco, ni red, ni
 * `process.env`»— y una prueba que mirase el fichero entero le prohibiría explicarse.
 */
const CODIGO = FUENTE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

/**
 * Una ruta de muestra por cada forma que el sitio construye: la página 1 y la 2 de cada
 * listado, y una de cada superficie suelta. Es lo que se le pregunta a `modelosEnRuta`.
 */
const RUTAS_DE_MUESTRA = [
  '/',
  '/cita/una-cita/',
  '/autor/seneca/',
  '/autor/seneca/2/',
  '/tema/el-tiempo/',
  '/tema/el-tiempo/2/',
  '/coleccion/una-coleccion/',
  '/coleccion/una-coleccion/2/',
  '/buscar/',
  '/404',
  '/kit/',
  '/lote/',
];

/**
 * Un Modelo cualquiera al que retorcerle un campo, para probar la revisión.
 *
 * Trae `destino` puesto porque la revisión lo exige a todo Modelo encendido: sin él, cada
 * prueba que enciende este molde para medir **otra** cosa recogería dos fallos en vez de uno
 * y dejaría de decir lo que dice. Quien quiera el caso sin destino lo pide en claro, pasando
 * `destino: undefined`.
 */
function modeloDePrueba(campos: Partial<Modelo> = {}): Modelo {
  return {
    id: 'producto-propio',
    nombre: 'De prueba',
    encendido: false,
    dispara: 'enciende',
    umbral: { clase: 'sesiones-organicas-mensuales', sesiones: 1 },
    admitidoEn: [],
    destino: 'https://ejemplo.invalido/apoyar',
    nota: 'para la prueba',
    ...campos,
  };
}

describe('Historia 14.1 — los cuatro Modelos y su estado', () => {
  it('están los cuatro, sin repetirse', () => {
    expect(MODELOS.map((m) => m.id)).toEqual([
      'donaciones',
      'afiliacion-de-libros',
      'producto-propio',
      'publicidad-acotada',
    ]);
  });

  it('hoy los cuatro están apagados', () => {
    expect(MODELOS.filter((m) => m.encendido)).toEqual([]);
    expect(modelosEncendidos()).toEqual([]);
  });

  it('y ninguna ruta aloja ninguno, porque para alojarlo hace falta estar encendido', () => {
    // Las dos condiciones a la vez: `modelosEnRuta` cruza admisión y estado. La portada admite
    // las donaciones y aun así no aloja nada, que es lo que significa «apagado».
    for (const ruta of RUTAS_DE_MUESTRA) expect(modelosEnRuta(ruta), ruta).toEqual([]);
    expect(modeloDe('donaciones')?.admitidoEn).toContain('index.astro');
  });

  it('y el cruce sabe decir que sí: encendido y admitido, la superficie lo aloja', () => {
    /*
     * El control positivo de la aserción de arriba, que hoy afirma nueve vacíos. Sin esto, un
     * `modelosEn` que devolviera siempre `[]` —o que mirase solo el estado, o solo la
     * admisión— daría verde en las nueve superficies y también el día del encendido.
     */
    const encendidas: Modelo[] = [{ ...(modeloDe('donaciones') as Modelo), encendido: true }];
    expect(modelosEnRuta('/', encendidas).map((m) => m.id)).toEqual(['donaciones']);
    expect(modelosEnRuta('/cita/una-cita/', encendidas)).toEqual([]);
  });

  it('encender uno es cambiar un solo booleano, y nada más', () => {
    /*
     * El criterio de aceptación por dentro: con el mismo Modelo y el `encendido` cambiado,
     * la superficie que ya lo admitía pasa a alojarlo. No hay segundo sitio que tocar, y por
     * eso `git revert` de esa línea lo apaga entero.
     */
    const encendido = { ...(modeloDe('donaciones') as Modelo), encendido: true };
    expect(revisarDeclaracionDeIngreso([encendido])).toEqual([]);
    expect(encendido.admitidoEn).toEqual(['index.astro', 'buscar.astro', '404.astro']);
  });

  it('cada Modelo declara qué dispara su Umbral, y el de la afiliación es solicitar', () => {
    // El hallazgo que le da forma al módulo: «cruzado ⇒ encender» no vale para las cuatro
    // filas. Si esto se cayera, el aviso del mando mentiría en la afiliación.
    expect(modeloDe('afiliacion-de-libros')?.dispara).toBe('solicita');
    for (const id of ['donaciones', 'producto-propio', 'publicidad-acotada']) {
      expect(modeloDe(id)?.dispara, id).toBe('enciende');
    }
  });
});

describe('Historia 14.1 — los Umbrales viven en umbrales.ts y en ningún otro sitio', () => {
  it('los tres numéricos son literalmente las constantes de umbrales.ts', () => {
    expect(modeloDe('afiliacion-de-libros')?.umbral).toEqual({
      clase: 'sesiones-organicas-mensuales',
      sesiones: SESIONES_PARA_AFILIACION,
    });
    expect(modeloDe('producto-propio')?.umbral).toEqual({
      clase: 'sesiones-organicas-mensuales',
      sesiones: SESIONES_PARA_PRODUCTO_PROPIO,
    });
    expect(modeloDe('publicidad-acotada')?.umbral).toEqual({
      clase: 'sesiones-organicas-mensuales',
      sesiones: SESIONES_PARA_PUBLICIDAD,
    });
  });

  it('el de donaciones no es numérico, y es la fila que impide tratarlas a las cuatro igual', () => {
    expect(modeloDe('donaciones')?.umbral).toEqual({
      clase: 'condiciones-de-lanzamiento',
      condiciones: CONDICIONES_PARA_DONACIONES,
    });
  });

  it('ninguna cifra de Umbral está escrita a mano en el módulo del estado', () => {
    // AD-9 sobre el fichero: los números llegan importados. Un `2000` tecleado aquí sería
    // el segundo sitio donde vive un Umbral, y el que nadie actualizaría.
    for (const cifra of [SESIONES_PARA_AFILIACION, SESIONES_PARA_PRODUCTO_PROPIO, SESIONES_PARA_PUBLICIDAD]) {
      expect(CODIGO, String(cifra)).not.toMatch(new RegExp(`\\b${cifra}\\b`));
    }
  });
});

describe('Historia 14.1 — el estado no se deriva de nada que no sea el módulo', () => {
  it('el módulo no lee entorno, ni disco, ni red', () => {
    /*
     * AD-14 y AD-21 en una aserción sobre el propio fichero. Es tosca a propósito: cualquier
     * forma de que el estado dependa de algo de fuera —una bandera de entorno, un fichero,
     * una consulta al receptor— pasa por una de estas palabras, y con ella dejaría de ser
     * cierto que encender es un diff y `git revert` lo apaga.
     */
    for (const prohibido of ['process.env', 'import.meta.env', 'fetch(', 'node:fs', 'readFile']) {
      expect(CODIGO, prohibido).not.toContain(prohibido);
    }
  });

  it('lo único que importa son las superficies y los umbrales', () => {
    const importados = [...CODIGO.matchAll(/from '([^']+)'/g)].map((m) => m[1]);
    expect(importados.sort()).toEqual(['./superficies.ts', './umbrales.ts']);
  });
});

describe('Historia 14.1 — qué superficie admite qué Modelo', () => {
  it('toda superficie admitida existe en el censo de superficies', () => {
    const declaradas = SUPERFICIES.map((s) => s.pagina);
    for (const modelo of MODELOS) {
      for (const pagina of modelo.admitidoEn) expect(declaradas, modelo.id).toContain(pagina);
    }
  });

  it('hoy ninguna superficie de lectura admite ningún Modelo', () => {
    // El estado, que es más estricto que la regla: la afiliación **podría** admitirse en la
    // Página de Cita y aun así no está admitida en ninguna parte, porque falta decidir qué
    // edición se enlaza y la cuenta ni siquiera está solicitada.
    for (const modelo of MODELOS) {
      for (const lectura of SUPERFICIES_DE_LECTURA) {
        expect(modelo.admitidoEn, `${modelo.id} / ${lectura}`).not.toContain(lectura);
      }
    }
  });

  it('la regla veda ahí a las donaciones y a la publicidad, y solo a esas dos', () => {
    /*
     * La enmienda de contrato: la exclusión nace de las donaciones y aguas arriba se estrechó
     * a la publicidad. La afiliación es la excepción registrada porque no añade superficie —
     * enlaza la Procedencia que la Página de Cita ya muestra— y una regla que dijera «ningún
     * Modelo» la cerraría por omisión, obligando a reabrir la discusión el día de solicitar
     * la cuenta.
     */
    expect([...MODELOS_VEDADOS_EN_LECTURA].sort()).toEqual(['donaciones', 'publicidad-acotada']);
  });

  it('las superficies de lectura son las que declara superficies.ts', () => {
    // Sin esto, un renombrado de la Página de Colección dejaría la exclusión apuntando a un
    // fichero que ya no existe y la superficie de verdad, admitida sin que nadie lo decidiera.
    const declaradas = SUPERFICIES.map((s) => s.pagina);
    for (const lectura of SUPERFICIES_DE_LECTURA) expect(declaradas).toContain(lectura);
  });

  it('las donaciones solo pueden ir en superficies de no lectura — UX-DR36', () => {
    expect(modeloDe('donaciones')?.admitidoEn).toEqual(['index.astro', 'buscar.astro', '404.astro']);
  });
});

describe('Historia 14.2 — a dónde lleva la invitación', () => {
  it('el destino es dato del Modelo, y las donaciones lo declaran', () => {
    /*
     * Vive aquí y no en las tres páginas: escrito en cada una serían tres sitios que pueden
     * divergir sin que nada falle, y la divergencia se descubriría cuando alguien no pudiera
     * pagar. Cambiar de proveedor tiene que ser esta línea.
     */
    const destino = modeloDe('donaciones')?.destino;
    expect(destino).toBeDefined();
    expect(destino).toMatch(/^https:\/\/[^\s]+$/);
    // Y cruza su propia puerta: el día que se encienda, la revisión no tendrá nada que decir
    // de su forma. Lo que la revisión **no** puede comprobar es que la dirección exista, y
    // eso es requisito manual del commit que encienda (AGENTS.md, DESPLIEGUE.md §3).
    expect(
      revisarDeclaracionDeIngreso([{ ...(modeloDe('donaciones') as Modelo), encendido: true }]),
    ).toEqual([]);
  });

  it('los demás no lo declaran todavía, y es coherente con no tener superficie', () => {
    // Ni la afiliación —falta decidir qué edición se enlaza—, ni el producto propio —no
    // existe—, ni la publicidad. Ninguno está admitido en ninguna parte, así que no hay a
    // dónde llevar a nadie, y fingir un destino sería la primera mentira del censo.
    for (const id of ['afiliacion-de-libros', 'producto-propio', 'publicidad-acotada']) {
      expect(modeloDe(id)?.destino, id).toBeUndefined();
      expect(modeloDe(id)?.admitidoEn, id).toEqual([]);
    }
  });

  it('apagado, el destino no admite nada por sí solo', () => {
    // Declarar a dónde iría no es encenderlo: `modelosEnRuta` sigue cruzando estado y
    // admisión, y con las donaciones apagadas las tres superficies que las admiten siguen sin
    // alojarlas.
    for (const ruta of ['/', '/buscar/', '/404']) {
      expect(modelosEnRuta(ruta), ruta).toEqual([]);
    }
  });

  it('un Modelo encendido sin destino se rechaza', () => {
    /*
     * El hermano exacto de «encendido y no lo admite ninguna superficie»: uno no se ve en
     * ninguna parte y este se ve y no lleva a ninguna. Va en la revisión y no en el
     * componente porque el módulo se revisa **al cargar**, y desde la 14.2 tres páginas lo
     * importan.
     *
     * Que eso **detenga el build** no se afirma aquí: esto es la función pura, y de una
     * función que devuelve una lista no se sigue que ninguna construcción se caiga. Lo ata
     * `tests/unit/ingreso-construido.test.ts`, que construye un proyecto con el destino
     * quitado y exige que `astro build` salga con código distinto de cero.
     */
    const fallos = revisarDeclaracionDeIngreso([
      modeloDePrueba({ encendido: true, admitidoEn: ['index.astro'], destino: undefined }),
    ]);
    expect(fallos).toHaveLength(1);
    expect(fallos[0]).toContain('no lleva a ninguna parte');
  });

  it('y declarar un destino en blanco tampoco es declararlo', () => {
    /*
     * `destino: ''` cruzaba la puerta cuando solo se miraba la presencia, y se renderiza como
     * `<a href="">`: eso **recarga la página que el visitante estaba leyendo** en vez de
     * llevarlo a ninguna parte. Es la misma avería que la puerta existe para impedir, y es
     * además lo que su vecina ya hacía con `nombre.trim() === ''`.
     */
    for (const enBlanco of ['', '   ', '\n\t']) {
      const fallos = revisarDeclaracionDeIngreso([
        modeloDePrueba({ encendido: true, admitidoEn: ['index.astro'], destino: enBlanco }),
      ]);
      expect(fallos, JSON.stringify(enBlanco)).toHaveLength(1);
      expect(fallos[0]).toContain('en blanco');
    }
  });

  it('y un destino que no es «https://» se rechaza', () => {
    // Una invitación a pagar no se publica en claro, ni con un esquema cualquiera, ni con
    // espacios pegados delante: las tres formas dejan un enlace que no hace lo que dice.
    for (const torcido of [
      'http://ko-fi.com/alguien',
      'ko-fi.com/alguien',
      '/apoyar',
      'javascript:void 0',
      ' https://ko-fi.com/alguien',
      'https://',
    ]) {
      const fallos = revisarDeclaracionDeIngreso([
        modeloDePrueba({ encendido: true, admitidoEn: ['index.astro'], destino: torcido }),
      ]);
      expect(fallos, torcido).toHaveLength(1);
      expect(fallos[0], torcido).toContain('https://');
    }
  });

  it('y apagado no se le exige nada al destino, que es lo que lo deja abierto', () => {
    /*
     * La puerta juzga **Modelos encendidos**. Un Modelo apagado puede no tener destino todavía
     * —es el estado de tres de los cuatro— y puede incluso tenerlo a medias mientras se
     * decide; exigirle forma convertiría la revisión en un obstáculo para escribir el estado
     * que la épica quiere que sea fácil de escribir.
     */
    for (const destino of [undefined, '', 'ko-fi.com/alguien']) {
      expect(revisarDeclaracionDeIngreso([modeloDePrueba({ destino })]), String(destino)).toEqual(
        [],
      );
    }
  });

  it('y con destino, el mismo Modelo encendido se acepta', () => {
    // El control positivo: sin él, la aserción de arriba pasaría igual con una revisión que
    // rechazara cualquier Modelo encendido.
    expect(
      revisarDeclaracionDeIngreso([
        modeloDePrueba({ encendido: true, admitidoEn: ['index.astro'] }),
      ]),
    ).toEqual([]);
  });

  it('encender las donaciones tal como están declaradas hoy no rompe la revisión', () => {
    // La promesa de la épica por dentro: el diff de una línea deja la declaración en pie.
    // Si esto fallara, encender exigiría un segundo cambio y la promesa sería falsa.
    const encendido = { ...(modeloDe('donaciones') as Modelo), encendido: true };
    expect(revisarDeclaracionDeIngreso([encendido])).toEqual([]);
  });
});

describe('Historia 14.1 — la revisión de la declaración', () => {
  it('la declaración de hoy se sostiene', () => {
    expect(revisarDeclaracionDeIngreso()).toEqual([]);
  });

  it('colar las donaciones o la publicidad en una superficie de lectura se rechaza', () => {
    // La otra mitad de la prueba de estado: sin esto, aquella pasaría igual con una revisión
    // que no mirara nada.
    for (const id of MODELOS_VEDADOS_EN_LECTURA) {
      for (const lectura of SUPERFICIES_DE_LECTURA) {
        const fallos = revisarDeclaracionDeIngreso([
          modeloDePrueba({ id, admitidoEn: [lectura] }),
        ]);
        expect(fallos, `${id} / ${lectura}`).toHaveLength(1);
        expect(fallos[0]).toContain(lectura);
        expect(fallos[0]).toContain('superficie de lectura');
      }
    }
  });

  it('y la afiliación en la Página de Cita también, pero por su propia regla y no por esta', () => {
    /*
     * Hasta la v7.1 la afiliación era la excepción registrada de la Página de Cita y esta
     * prueba afirmaba que ahí pasaba. AD-20 v7.1 revocó la excepción: la afiliación solo se
     * admite en la Página de Obra. Se rechaza, pero con **un** fallo y el de su regla —no el de
     * superficie de lectura—, porque la lista de vedados sigue siendo la de las donaciones y la
     * publicidad.
     */
    const fallos = revisarDeclaracionDeIngreso([
      modeloDePrueba({ id: 'afiliacion-de-libros', admitidoEn: ['cita/[slug].astro'] }),
    ]);
    expect(fallos).toHaveLength(1);
    expect(fallos[0]).toContain('Página de Obra');
    expect(fallos[0]).not.toContain('superficie de lectura');
  });

  it('admitir una superficie que nadie ha declarado se rechaza', () => {
    const fallos = revisarDeclaracionDeIngreso([
      modeloDePrueba({ admitidoEn: ['inventada.astro'] }),
    ]);
    expect(fallos).toHaveLength(1);
    expect(fallos[0]).toContain('src/lib/superficies.ts');
  });

  it('un Modelo encendido sin ninguna superficie que lo admita se rechaza', () => {
    // Es la avería que más cuesta entender: encendido, sin error, y sin aparecer en ninguna
    // parte. Se dice al encenderlo, no después de buscarlo por el sitio.
    const fallos = revisarDeclaracionDeIngreso([modeloDePrueba({ encendido: true })]);
    expect(fallos).toHaveLength(1);
    expect(fallos[0]).toContain('no aparece en ninguna parte');
  });

  it('el mismo Modelo declarado dos veces se rechaza', () => {
    const fallos = revisarDeclaracionDeIngreso([modeloDePrueba(), modeloDePrueba()]);
    expect(fallos.some((f) => f.includes('dos veces'))).toBe(true);
  });

  it('las erratas que dejarían una entrada inservible se rechazan', () => {
    // Ninguna de las tres rompe nada al cargar, y las tres dejan el informe mintiendo: una
    // superficie repetida, un Modelo sin nombre con el que nombrarlo, y un Umbral de
    // condiciones sin condiciones, que se imprime como « verificadas» y se lee como cumplido.
    expect(
      revisarDeclaracionDeIngreso([modeloDePrueba({ admitidoEn: ['404.astro', '404.astro'] })]),
    ).toHaveLength(1);
    expect(revisarDeclaracionDeIngreso([modeloDePrueba({ nombre: '  ' })])).toHaveLength(1);
    expect(
      revisarDeclaracionDeIngreso([
        modeloDePrueba({ umbral: { clase: 'condiciones-de-lanzamiento', condiciones: [] } }),
      ]),
    ).toHaveLength(1);
  });

  it('el censo de hoy está completo, y que falte uno de los cuatro se rechaza', () => {
    /*
     * Borrar `producto-propio` pasaba la revisión: el Modelo desaparecía del informe y del
     * aviso, y nadie volvía a preguntar por su Umbral. Un Modelo que se queda sin vigilancia
     * en silencio es peor que uno encendido por error, porque nada vuelve a nombrarlo.
     */
    expect(revisarCensoDeIngreso()).toEqual([]);
    expect(MODELOS).toHaveLength(4);
  });
});

describe('Historia 14.1 — la marca con la que una superficie aloja un Modelo', () => {
  it('reconoce lo marcado, con comillas dobles y simples', () => {
    /*
     * El control positivo de la prueba sobre el sitio construido: allí se afirma que no hay
     * ni un marcador en todo `dist/`, y esa afirmación no vale nada si el detector no supiera
     * encontrar uno. Aquí se le pone delante.
     */
    const html = `<aside ${MARCA_DE_INGRESO}="donaciones">…</aside><p ${MARCA_DE_INGRESO}='publicidad-acotada'></p>`;
    expect(modelosMarcadosEn(html)).toEqual(['donaciones', 'publicidad-acotada']);
  });

  it('devuelve también lo que no es un Modelo declarado', () => {
    // Una errata en el marcador es exactamente lo que hay que ver, no algo que filtrar.
    expect(modelosMarcadosEn(`<div ${MARCA_DE_INGRESO}="donacines"></div>`)).toEqual(['donacines']);
  });

  it('y ve también el atributo sin comillas y el atributo sin valor', () => {
    // Las cuatro formas que admite el HTML, no solo las dos que emite Astro: quien busca lo
    // que no debería estar no puede fiarse de que se escribiera de la forma más común.
    expect(modelosMarcadosEn(`<a ${MARCA_DE_INGRESO}=donaciones>`)).toEqual(['donaciones']);
    expect(modelosMarcadosEn(`<a ${MARCA_DE_INGRESO}>`)).toEqual(['']);
  });

  it('no ve nada donde no hay nada', () => {
    expect(modelosMarcadosEn('<main><p>Una Cita cualquiera.</p></main>')).toEqual([]);
  });
});

/** Un censo de superficies con una Página de Obra inventada, paginada como sus vecinas. */
function conPaginaDeObra(pagina: string): Superficie[] {
  return [
    ...SUPERFICIES,
    {
      nombre: 'la Página de Obra',
      pagina,
      reconoce: /^\/obra\/[^/]+\/[^/]+(?:\/\d+)?$/,
      caracter: 'producto',
      noPublicableEn: /^\/obra\/[^/]+\/[^/]+\/\d+$/,
    },
  ];
}

/**
 * Historia 17.5 — un Modelo se admite por ruta.
 *
 * La admisión se sigue **nombrando** por superficie, pero se **consulta** por ruta, con el
 * mismo predicado con el que `src/lib/superficies.ts` declara las superficies. Las
 * declaraciones de abajo son inventadas a propósito: hoy ningún Modelo está encendido, ninguno
 * está admitido en un listado y la Página de Obra no existe, así que sobre la declaración real
 * casi todo daría vacío y no demostraría nada.
 */
describe('Historia 17.5 — la admisión se consulta por ruta', () => {
  const TEMA = 'tema/[slug]/[...page].astro';

  /** Las donaciones encendidas y admitidas además en el listado de Tema: inventado. */
  const conElListadoDeTema: Modelo[] = [
    {
      ...(modeloDe('donaciones') as Modelo),
      encendido: true,
      admitidoEn: ['index.astro', 'buscar.astro', '404.astro', TEMA],
    },
  ];

  it('la portada, con las donaciones encendidas, las aloja', () => {
    const encendidas: Modelo[] = [{ ...(modeloDe('donaciones') as Modelo), encendido: true }];
    expect(modelosEnRuta('/', encendidas).map((m) => m.id)).toEqual(['donaciones']);
    // Con y sin barra final es la misma ruta, como en `superficies.ts`.
    expect(modelosEnRuta('/buscar', encendidas).map((m) => m.id)).toEqual(['donaciones']);
    expect(modelosEnRuta('/buscar/', encendidas).map((m) => m.id)).toEqual(['donaciones']);
  });

  it('la página 1 de un listado admitido lo aloja', () => {
    expect(modelosEnRuta('/tema/x/', conElListadoDeTema).map((m) => m.id)).toEqual(['donaciones']);
  });

  it('y su página 2+ no, aunque la admita su fichero: es servicio por forma', () => {
    /*
     * El defecto que la historia cierra. Por fichero, `/tema/x/2/` es `tema/[slug]/[...page].astro`
     * igual que `/tema/x/`, y `modelosEn(fichero)` le daba las donaciones. Por ruta, la forma
     * de la página 2 la excluye.
     */
    for (const ruta of ['/tema/x/2/', '/tema/x/2', '/tema/x/37/']) {
      expect(modelosEnRuta(ruta, conElListadoDeTema), ruta).toEqual([]);
    }
    // Y la superficie es la misma: lo que cambia es la forma de la ruta, no el fichero.
    expect(SUPERFICIES.find((s) => s.reconoce.test('/tema/x/2'))?.pagina).toBe(TEMA);
  });

  it('las páginas 2+ de los tres listados que pueden admitir quedan fuera, sea cual sea el Modelo', () => {
    /*
     * Tema, Colección y la Página de Obra inventada: los listados paginados en los que una
     * declaración **podría** admitir un Modelo. El de Autor no entra porque la historia lo
     * prohíbe y la revisión lo rechaza; usarlo aquí sería probar sobre una declaración que no
     * se puede escribir. Colección es superficie de lectura, así que el Modelo es
     * `producto-propio`, que no está vedado ahí.
     */
    const superficies = conPaginaDeObra('obra/[autor]/[slug]/[...page].astro');
    const enLosTres: Modelo[] = [
      modeloDePrueba({
        encendido: true,
        admitidoEn: [TEMA, 'coleccion/[slug]/[...page].astro', 'obra/[autor]/[slug]/[...page].astro'],
      }),
    ];
    expect(revisarDeclaracionDeIngreso(enLosTres, superficies)).toEqual([]);
    for (const ruta of ['/tema/el-tiempo/2/', '/coleccion/una/2/', '/obra/cervantes/el-quijote/2/']) {
      expect(modelosEnRuta(ruta, enLosTres, superficies), ruta).toEqual([]);
    }
    // El control positivo: la página 1 de los tres sí lo aloja con esta misma declaración.
    for (const ruta of ['/tema/el-tiempo/', '/coleccion/una/', '/obra/cervantes/el-quijote/']) {
      expect(modelosEnRuta(ruta, enLosTres, superficies), ruta).toHaveLength(1);
    }
  });

  it('un slug numérico es página 1 y no página 2+: la forma es la de la ruta entera', () => {
    // `/tema/1984` es un Tema, no la página 1984 de nada (superficies.ts lo ancla así).
    expect(modelosEnRuta('/tema/1984/', conElListadoDeTema).map((m) => m.id)).toEqual(['donaciones']);
  });

  it('la restricción es solo de forma: una superficie de servicio por declaración sí admite', () => {
    /*
     * `/buscar` y `/404` son `servicio` por su declaración, no por la forma de su ruta, y son
     * justo las superficies que UX-DR36 da a las donaciones. Si la admisión preguntara por
     * `caracterDe` en vez de por la forma, las perdería; y el día que la 22.4 declare servicio
     * por contenido una Obra que repite otra, lo mismo.
     */
    const encendidas: Modelo[] = [{ ...(modeloDe('donaciones') as Modelo), encendido: true }];
    expect(modelosEnRuta('/404', encendidas).map((m) => m.id)).toEqual(['donaciones']);
  });

  it('la consulta y el fragmento se quitan antes de juzgar, también en una URL entera', () => {
    expect(modelosEnRuta('/tema/x/2/?orden=a', conElListadoDeTema)).toEqual([]);
    expect(modelosEnRuta('/tema/x/2/#arriba', conElListadoDeTema)).toEqual([]);
    expect(modelosEnRuta('https://ejemplo.invalido/tema/x/2/?a=b#c', conElListadoDeTema)).toEqual([]);
    // Y los controles positivos: la página 1 con consulta o fragmento sigue alojándolo.
    for (const ruta of [
      '/tema/x/?orden=a',
      '/tema/x/#arriba',
      '/?utm_source=x#hoy',
      'https://ejemplo.invalido/tema/x/?a=b#c',
    ]) {
      expect(modelosEnRuta(ruta, conElListadoDeTema).map((m) => m.id), ruta).toEqual(['donaciones']);
    }
  });

  it('una ruta que nadie ha declarado rompe, con el fichero que hay que tocar', () => {
    expect(() => modelosEnRuta('/inventada/')).toThrow('src/lib/superficies.ts');
  });
});

describe('Historia 17.5 — la afiliación solo en la Página de Obra', () => {
  /** Las dos formas que podría tener su fichero: la de la espina y la del contrato. */
  const OBRAS = ['obra/[autor]/[slug]/[...page].astro', 'obra/[autor]/[obra].astro'];


  const afiliacion = (admitidoEn: string[], encendido = false) =>
    modeloDePrueba({ id: 'afiliacion-de-libros', admitidoEn, encendido });

  it('fuera de la Página de Obra se rechaza, también en la portada', () => {
    for (const pagina of ['index.astro', 'buscar.astro', '404.astro', 'cita/[slug].astro']) {
      const fallos = revisarDeclaracionDeIngreso([afiliacion([pagina])]);
      expect(fallos, pagina).toHaveLength(1);
      expect(fallos[0], pagina).toContain('solo puede admitirse en la Página de Obra');
    }
  });

  it('en la Página de Obra no falla por esta regla', () => {
    for (const obra of OBRAS) {
      expect(revisarDeclaracionDeIngreso([afiliacion([obra])], conPaginaDeObra(obra)), obra).toEqual(
        [],
      );
    }
  });

  it('desde la 22.4 la Página de Obra existe, y es la única superficie real que cumple la regla', () => {
    // Antes de la 22.4 ninguna superficie real cumplía `esPaginaDeObra` y esta prueba lo fijaba.
    // Ahora la Obra está declarada: admitir ahí la afiliación no falla por ninguna regla, y lo
    // que la mantiene fuera es su `admitidoEn`, que la 22.9 tocará.
    expect(SUPERFICIES.filter((s) => esPaginaDeObra(s.pagina)).map((s) => s.pagina)).toEqual([
      OBRAS[0],
    ]);
    expect(revisarDeclaracionDeIngreso([afiliacion([OBRAS[0]])])).toEqual([]);
    expect(modeloDe('afiliacion-de-libros')?.admitidoEn).toEqual([]);
  });

  it('la Página de Obra es de lectura: donaciones y publicidad se rechazan ahí — 22.4', () => {
    expect(SUPERFICIES_DE_LECTURA).toContain(OBRAS[0]);
    for (const id of MODELOS_VEDADOS_EN_LECTURA) {
      const fallos = revisarDeclaracionDeIngreso([modeloDePrueba({ id, admitidoEn: [OBRAS[0]] })]);
      expect(fallos.length, id).toBeGreaterThan(0);
      expect(fallos.join('\n'), id).toContain('superficie de lectura');
    }
  });

  it('esPaginaDeObra reconoce lo que genera src/pages/obra/ y nada más', () => {
    for (const obra of OBRAS) expect(esPaginaDeObra(obra), obra).toBe(true);
    for (const otra of [
      'obras.astro',
      'autor/[slug]/[...page].astro',
      'obra/[autor]/[slug].png.ts',
      'obra/index.astro',
      'obra/_parcial.astro',
      'obra/[autor]/_comun/[slug].astro',
    ]) {
      expect(esPaginaDeObra(otra), otra).toBe(false);
    }
  });

  it('admitida en la Obra, la página 1 la aloja y la 2+ no — la forma vale también ahí', () => {
    const obra = OBRAS[0];
    const superficies = conPaginaDeObra(obra);
    const encendida = [{ ...afiliacion([obra], true) }];
    expect(modelosEnRuta('/obra/cervantes/el-quijote/', encendida, superficies)).toHaveLength(1);
    expect(modelosEnRuta('/obra/cervantes/el-quijote/2/', encendida, superficies)).toEqual([]);
  });
});

describe('Historia 17.5 — la Página de Autor no aloja ningún Modelo', () => {
  const AUTOR = 'autor/[slug]/[...page].astro';

  it('cualquier Modelo admitido en el listado de Autor se rechaza', () => {
    for (const modelo of MODELOS) {
      const fallos = revisarDeclaracionDeIngreso([{ ...modelo, admitidoEn: [AUTOR] }]);
      expect(
        fallos.some((f) => f.includes(AUTOR) && f.includes('no aloja ningún Modelo')),
        modelo.id,
      ).toBe(true);
    }
  });

  it('el control positivo: el mismo Modelo en el listado de Tema no falla por esta regla', () => {
    const fallos = revisarDeclaracionDeIngreso([
      modeloDePrueba({ admitidoEn: ['tema/[slug]/[...page].astro'] }),
    ]);
    expect(fallos).toEqual([]);
  });

  it('la regla nombra una superficie que existe, y si desaparece del censo se dice', () => {
    expect(SUPERFICIES_SIN_INGRESO).toEqual([AUTOR]);
    for (const pagina of SUPERFICIES_SIN_INGRESO) {
      expect(SUPERFICIES.map((s) => s.pagina)).toContain(pagina);
    }
    const sinAutor = SUPERFICIES.filter((s) => s.pagina !== AUTOR);
    const fallos = revisarDeclaracionDeIngreso([modeloDePrueba()], sinAutor);
    expect(fallos).toHaveLength(1);
    expect(fallos[0]).toContain('superficie sin ingreso');
  });
});
