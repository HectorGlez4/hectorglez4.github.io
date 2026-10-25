import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import {
  CAMPOS,
  CAMPOS_DE_EVENTO,
  CLAVE_EN_LA_BALIZA,
  DESTINOS_DE_DESCARGA,
  EVENTOS,
  EVENTOS_VALIDOS,
  FILTROS,
  MARCAS_DE_OBRA,
  METRICA_DE_ACCION,
  PARAMETRO_DE_DIFUSION,
  PARAMETRO_DE_ORIGEN,
  PRIMERA,
  TRAMOS,
  ZONAS,
  claveEnLaBaliza,
  filtrosUsados,
  tramoDe,
  type Campo,
  type Evento,
} from '../../src/lib/vocabulario.ts';
import {
  DESTINO_DE_IMAGEN,
  DESTINO_OPACO,
  DESTINOS_DE_ENLACE,
  DESTINOS_VALIDOS,
} from '../../src/lib/destinos.ts';
import { PARAMETRO_DE_ORIGEN as PARAMETRO_DE_REDES, REDES_VALIDAS } from '../../src/lib/redes.ts';
import {
  CAMPOS_DEL_GUION,
  EVENTOS_DE_VISTA,
  EVENTOS_DEL_GUION,
  EVENTOS_SOLO_DEL_FICHERO,
} from '../../src/lib/medicion.ts';
import { interpretar } from '../../medicion/receptor.ts';
import { medicionEnUnSandbox } from './ayuda/medicion.js';
import { listaTras } from './ayuda/d1.js';

const raiz = resolve(import.meta.dirname, '../..');
const INSTANTE = new Date('2026-10-24T12:00:00Z');

/**
 * Historia 23.2 — el vocabulario de la v8, en un módulo puro, y la prueba de correspondencia.
 *
 * AD-13: las claves que el guion emite para cada evento son **exactamente** las que el
 * vocabulario le declara —un campo que falta pasaría una prueba de inclusión—, cada valor es de
 * su conjunto —uno de fuera llega a nulo sin error—, y esas claves ⊆ el registro del receptor ⊆
 * las columnas del esquema.
 */

/** Las importaciones de un fichero, leídas por el compilador: `import` y `export … from`. */
function importacionesDe(ruta: string): string[] {
  const fuente = ts.createSourceFile(ruta, readFileSync(resolve(raiz, ruta), 'utf8'), ts.ScriptTarget.Latest);
  const especificadores: string[] = [];
  const visitar = (nodo: ts.Node) => {
    if ((ts.isImportDeclaration(nodo) || ts.isExportDeclaration(nodo)) && nodo.moduleSpecifier) {
      especificadores.push((nodo.moduleSpecifier as ts.StringLiteral).text);
    }
    if (ts.isCallExpression(nodo) && nodo.expression.kind === ts.SyntaxKind.ImportKeyword) {
      especificadores.push(nodo.arguments[0]?.getText(fuente) ?? '(import sin argumento)');
    }
    ts.forEachChild(nodo, visitar);
  };
  visitar(fuente);
  return especificadores;
}

describe('Historia 23.2 — el vocabulario es un módulo puro que solo importa dos hojas', () => {
  it('vocabulario.ts importa destinos.ts y redes.ts, y nada más', () => {
    expect([...new Set(importacionesDe('src/lib/vocabulario.ts'))].sort()).toEqual([
      './destinos.ts',
      './redes.ts',
    ]);
  });

  it.each(['src/lib/destinos.ts', 'src/lib/redes.ts'])('%s es una hoja: no importa nada', (ruta) => {
    expect(importacionesDe(ruta)).toEqual([]);
  });

  it('no copia los conjuntos de las hojas: los nombra', () => {
    // La misma referencia, no una lista igual: una copia se quedaría atrás al añadir una red o
    // un destino, y el receptor descartaría en silencio lo que el sitio ya envía.
    for (const evento of [EVENTOS.vistaDeCita, EVENTOS.vistaDeSuperficie, EVENTOS.vistaDeObra, EVENTOS.lectura]) {
      expect(CAMPOS_DE_EVENTO[evento].origen?.valores, evento).toBe(REDES_VALIDAS);
      expect(CAMPOS_DE_EVENTO[evento].via?.valores, evento).toBe(DESTINOS_VALIDOS);
    }
    for (const evento of [EVENTOS.comparticionDeEnlace, EVENTOS.comparticionDeImagen]) {
      expect(CAMPOS_DE_EVENTO[evento].destino?.valores, evento).toBe(DESTINOS_VALIDOS);
    }
    expect(DESTINOS_DE_DESCARGA).toEqual([DESTINO_OPACO, DESTINO_DE_IMAGEN]);
    expect(PARAMETRO_DE_ORIGEN).toBe(PARAMETRO_DE_REDES);
    expect(PARAMETRO_DE_DIFUSION).toBe('via');
  });

  it('su fuente no escribe a mano ninguna red ni ningún destino', () => {
    const fuente = readFileSync(resolve(raiz, 'src/lib/vocabulario.ts'), 'utf8');
    for (const valor of [...REDES_VALIDAS, ...DESTINOS_VALIDOS]) {
      expect(fuente, valor).not.toContain(`'${valor}'`);
      expect(fuente, valor).not.toContain(`"${valor}"`);
    }
  });
});

describe('Historia 23.2 — los eventos y los conjuntos cerrados', () => {
  it('son los siete de la v7.1 y los cuatro de la v8', () => {
    expect([...EVENTOS_VALIDOS].sort()).toEqual(
      [
        'busqueda',
        'busqueda-sin-resultados',
        'comparticion-de-enlace',
        'comparticion-de-imagen',
        'copiado',
        'descarga-de-imagen',
        'lectura',
        'salida-interna',
        'vista-de-cita',
        'vista-de-obra',
        'vista-de-superficie',
      ].sort(),
    );
    // Cada evento declara sus campos, aunque sean ninguno: un evento sin entrada no compila.
    expect(Object.keys(CAMPOS_DE_EVENTO).sort()).toEqual([...EVENTOS_VALIDOS].sort());
  });

  it('las dieciséis zonas de EXPERIENCE.md, sin repetir', () => {
    expect(ZONAS).toHaveLength(16);
    expect(new Set(ZONAS).size).toBe(16);
    expect(CAMPOS_DE_EVENTO[EVENTOS.salidaInterna].zona?.valores).toBe(ZONAS);
  });

  it('son las de la tabla de EXPERIENCE.md § Zonas de salida interna, en su orden', () => {
    // La tabla es la única fuente de las zonas (UX-DR111). Si cambia, el vocabulario se queda
    // atrás —una zona nueva llegaría a nulo— hasta que alguien la mire: esta prueba es ese alguien.
    const experiencia = readFileSync(
      resolve(raiz, '_bmad-output/planning-artifacts/ux-designs/ux-brainlySabiduria-2026-08-10/EXPERIENCE.md'),
      'utf8',
    );
    const seccion = experiencia.split(/^### Zonas de salida interna\b.*$/m)[1]?.split(/^#{2,3} /m)[0];
    expect(seccion, 'EXPERIENCE.md ya no tiene la sección «Zonas de salida interna»').toBeDefined();
    const deLaTabla = [...seccion!.matchAll(/^\| `([a-z-]+)` \|/gm)].map(([, zona]) => zona);
    expect(deLaTabla).toEqual([...ZONAS]);
  });

  it.each([
    [0, '0'],
    [1, '1-9'],
    [9, '1-9'],
    [10, '10-29'],
    [29, '10-29'],
    [30, '30+'],
    [1000, '30+'],
  ] as const)('tramoDe(%i) es «%s»', (total, rotulo) => {
    expect(tramoDe(total)).toBe(rotulo);
  });

  it('un total que no es un entero no negativo no tiene tramo', () => {
    for (const total of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) expect(tramoDe(total), String(total)).toBeNull();
  });

  it('los tramos empiezan en 0, crecen y sus rótulos son los valores del campo', () => {
    expect(TRAMOS[0].desde).toBe(0);
    for (let i = 1; i < TRAMOS.length; i++) expect(TRAMOS[i].desde).toBeGreaterThan(TRAMOS[i - 1].desde);
    expect(CAMPOS_DE_EVENTO[EVENTOS.busqueda].tramo?.valores).toEqual(TRAMOS.map((t) => t.rotulo));
  });

  it('seis combinaciones de filtros, y la Obra nunca va sin su Autor', () => {
    expect(FILTROS).toHaveLength(6);
    expect(CAMPOS_DE_EVENTO[EVENTOS.busqueda].filtros?.valores).toBe(FILTROS);
    const combinaciones: [boolean, boolean, boolean, string | null][] = [
      [false, false, false, 'ninguno'],
      [true, false, false, 'autor'],
      [false, false, true, 'tema'],
      [true, false, true, 'autor-tema'],
      [true, true, false, 'autor-obra'],
      [true, true, true, 'autor-obra-tema'],
      [false, true, false, null],
      [false, true, true, null],
    ];
    for (const [autor, obra, tema, esperada] of combinaciones) {
      expect(filtrosUsados({ autor, obra, tema }), `${autor} ${obra} ${tema}`).toBe(esperada);
    }
  });

  it('la marca de Obra, primera y la métrica de cada acción', () => {
    expect(MARCAS_DE_OBRA).toEqual(['indexable', 'no-indexable']);
    expect(PRIMERA).toEqual(['si', 'no']);
    const conPrimera = EVENTOS_VALIDOS.filter((evento) => CAMPOS_DE_EVENTO[evento].primera !== undefined);
    expect(Object.keys(METRICA_DE_ACCION).sort()).toEqual([...conPrimera].sort());
    expect(METRICA_DE_ACCION[EVENTOS.copiado]).toBe(METRICA_DE_ACCION[EVENTOS.descargaDeImagen]);
    expect(METRICA_DE_ACCION[EVENTOS.comparticionDeEnlace]).toBe(METRICA_DE_ACCION[EVENTOS.comparticionDeImagen]);
    expect(METRICA_DE_ACCION[EVENTOS.copiado]).not.toBe(METRICA_DE_ACCION[EVENTOS.comparticionDeEnlace]);
  });

  it('los destinos se parten en enlace e imagen, con el opaco aparte', () => {
    expect(DESTINOS_DE_ENLACE).toEqual(['whatsapp', 'telegram', 'x', 'correo', 'facebook', 'threads']);
    expect(DESTINO_DE_IMAGEN).toBe('instagram-historia');
    expect(DESTINOS_VALIDOS).toEqual([...DESTINOS_DE_ENLACE, DESTINO_DE_IMAGEN, DESTINO_OPACO]);
    expect(new Set(DESTINOS_VALIDOS).size).toBe(DESTINOS_VALIDOS.length);
  });

  it('CAMPOS son exactamente los que declara algún evento, y la consulta es solo de la búsqueda sin resultados', () => {
    const declarados = new Set(EVENTOS_VALIDOS.flatMap((e) => Object.keys(CAMPOS_DE_EVENTO[e])));
    expect([...declarados].sort()).toEqual([...CAMPOS].sort());
    expect(new Set(CAMPOS).size).toBe(CAMPOS.length);
    const conConsulta = EVENTOS_VALIDOS.filter((e) => CAMPOS_DE_EVENTO[e].consulta !== undefined);
    expect(conConsulta).toEqual([EVENTOS.busquedaSinResultados]);
    expect(CAMPOS_DE_EVENTO[EVENTOS.busquedaSinResultados].consulta?.valores).toBe('texto');
    // Ningún otro campo es texto libre.
    for (const evento of EVENTOS_VALIDOS) {
      for (const [campo, declaracion] of Object.entries(CAMPOS_DE_EVENTO[evento])) {
        if (campo !== 'consulta') expect(Array.isArray(declaracion?.valores), `${evento}.${campo}`).toBe(true);
      }
    }
    expect(CLAVE_EN_LA_BALIZA).toEqual({ consulta: 'datos' });
  });

  it('las marcas viajan solo con las vistas y la lectura, no con las acciones (AD-13)', () => {
    const conMarca = EVENTOS_VALIDOS.filter((e) => CAMPOS_DE_EVENTO[e].origen !== undefined).sort();
    expect(conMarca).toEqual(
      [EVENTOS.vistaDeCita, EVENTOS.vistaDeSuperficie, EVENTOS.vistaDeObra, EVENTOS.lectura].sort(),
    );
    const conDifusion = EVENTOS_VALIDOS.filter((e) => CAMPOS_DE_EVENTO[e].via !== undefined).sort();
    expect(conDifusion).toEqual(conMarca);
  });
});

/**
 * Lo que el vocabulario declara y el guion todavía no emite, por historia. **Sacar una entrada
 * de aquí es parte de su historia**, en el mismo diff que la enseña al guion: la prueba exige que
 * lo pendiente no salga, así que adelantarse o quedarse atrás la pone en rojo. Se vacía en la
 * 23.11.
 */
const PENDIENTES: readonly { historia: string; eventos?: readonly Evento[]; campos?: readonly [Evento, Campo][] }[] = [
  // La 23.6 enseñó `via` al guion, en las vistas y la lectura: ya no hay ningún campo pendiente.
  // La 23.7 le enseñó la salida interna, con su zona; la 23.8, la búsqueda, con su tramo y sus filtros.
  { historia: '23.9', eventos: [EVENTOS.vistaDeObra] },
];

const eventoPendiente = (evento: Evento) => PENDIENTES.some((p) => p.eventos?.includes(evento));
const campoPendiente = (evento: Evento, campo: Campo) =>
  eventoPendiente(evento) || PENDIENTES.some((p) => p.campos?.some(([e, c]) => e === evento && c === campo));

/** Los campos que el guion tiene que emitir con un evento: los declarados, menos los pendientes. */
const camposEsperados = (evento: Evento) =>
  (Object.keys(CAMPOS_DE_EVENTO[evento]) as Campo[]).filter((campo) => !campoPendiente(evento, campo));

/** Las columnas de `medicion/esquema.sql`, leídas como SQL. */
const columnasDelEsquema = () =>
  listaTras(
    readFileSync(resolve(raiz, 'medicion/esquema.sql'), 'utf8'),
    /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+eventos\s*\(/i,
  )!.map((definicion) => definicion.split(/\s+/)[0]);

/**
 * Cómo se produce, en el sandbox, cada evento que solo emite el fichero (Historias 23.5 y 23.7): no
 * pasa por `__medir`, así que no basta con pedirlo. Uno de `EVENTOS_SOLO_DEL_FICHERO` sin entrada
 * aquí deja la prueba en rojo.
 */
const PRODUCIR_DEL_FICHERO: {
  readonly [E in Evento]?: (entorno: ReturnType<typeof medicionEnUnSandbox>, entrada: Entrada) => void;
} = {
  // En una superficie con lectura —una vista declarada—, la primera interacción.
  [EVENTOS.lectura]: (entorno) => entorno.interactuar('pointerdown'),
  // Un clic en un enlace a otra ruta, dentro de la zona del escenario (por omisión, la primera).
  [EVENTOS.salidaInterna]: (entorno, entrada) =>
    entorno.pulsar({ href: '/cita/otra/', contenedores: [{ zona: entrada.zona ?? ZONA_POR_OMISION }] }),
};

/** Lo que entra en el sandbox para producir un evento. */
interface Entrada {
  busqueda?: string;
  datos?: string;
  destino?: string;
  /** La zona del contenedor del enlace que se pulsa, para la salida interna (Historia 23.7). */
  zona?: string;
  /** El rótulo del tramo que pasa la isla de `/buscar/` como segundo argumento (Historia 23.8). */
  tramo?: string;
  /** La combinación de filtros que pasa como tercero (Historia 23.8). */
  filtros?: string;
}

/** La zona con la que sale la salida interna de un escenario que no nombra ninguna. */
const ZONA_POR_OMISION = ZONAS[0];

/**
 * Lo que sale por la baliza al producir un evento en un entorno nuevo, con esa entrada: lo que
 * pasa una isla por `__medir`, la vista que declara la página o lo que hace el visitante para que
 * el fichero lo emita por su cuenta. Solo las balizas de ese evento: la vista declarada que
 * necesita la lectura no cuenta. Las vistas salen de `data-vistas`, como en el sitio: desde la
 * revisión de la 23.6, una vista que pida una isla sale sin Marcas de llegada.
 */
function producir(evento: Evento, entrada: Entrada) {
  if ((EVENTOS_DE_VISTA as readonly Evento[]).includes(evento)) {
    const entorno = medicionEnUnSandbox({ ruta: '/cita/una/', busqueda: entrada.busqueda, vistas: evento });
    return entorno.balizas().filter((baliza) => baliza.evento === evento);
  }
  const porSuCuenta = PRODUCIR_DEL_FICHERO[evento];
  if (EVENTOS_SOLO_DEL_FICHERO.includes(evento)) {
    expect(porSuCuenta, `${evento} lo emite solo el fichero y no tiene cómo producirse`).toBeDefined();
    const entorno = medicionEnUnSandbox({ ruta: '/cita/una/', busqueda: entrada.busqueda, vistas: EVENTOS.vistaDeCita });
    porSuCuenta!(entorno, entrada);
    return entorno.balizas().filter((baliza) => baliza.evento === evento);
  }
  const { emitir, balizas } = medicionEnUnSandbox({ ruta: '/cita/una/', busqueda: entrada.busqueda });
  // El tramo y los filtros de la búsqueda llegan en los mismos argumentos que la consulta y el destino.
  emitir(evento, entrada.tramo ?? entrada.datos, entrada.filtros ?? entrada.destino);
  return balizas();
}

/**
 * `primera` de la primera acción de un entorno nuevo (Historia 23.5): «si», salvo la descarga
 * con un destino de su conjunto —la que impuso el navegador—, que es siempre «no».
 */
const primeraEsperada = (evento: Evento, destino?: string) =>
  evento === EVENTOS.descargaDeImagen && (DESTINOS_DE_DESCARGA as readonly string[]).includes(destino ?? '') ? 'no' : 'si';

/** Lo que entra en el sandbox en cada escenario de un evento, y lo que debe salir de cada campo. */
interface Escenario extends Entrada {
  nombre: string;
  /** El valor esperado de cada campo, dada la entrada: el de su conjunto, o nulo. */
  esperado: (campo: Campo) => string | null;
}

const RED_AJENA = 'visitante-7f3a';
const DESTINO_AJENO = 'lo-que-me-invente';

function escenariosDe(evento: Evento): Escenario[] {
  const valoresDe = (campo: Campo) => {
    const valores = CAMPOS_DE_EVENTO[evento][campo]?.valores;
    return Array.isArray(valores) ? valores : [];
  };
  const escenarios: Escenario[] = [{ nombre: 'sin marca ni argumentos', esperado: () => null }];
  for (const red of [...REDES_VALIDAS, RED_AJENA]) {
    escenarios.push({
      nombre: `?${PARAMETRO_DE_ORIGEN}=${red}`,
      busqueda: `?${PARAMETRO_DE_ORIGEN}=${red}`,
      esperado: (campo) => (campo === 'origen' && valoresDe('origen').includes(red) ? red : null),
    });
  }
  // Historia 23.6 — la Marca de difusión: cada destino del conjunto y uno ajeno, también en los
  // eventos que no la declaran (ahí no debe salir); repetida, manda la primera aparición; y junto
  // a la de origen, cada una con su valor.
  const difusion = (valor: string) => `${PARAMETRO_DE_DIFUSION}=${valor}`;
  const deDifusion = (campo: Campo, valor: string) =>
    campo === 'via' && valoresDe('via').includes(valor) ? valor : null;
  for (const destino of [...DESTINOS_VALIDOS, DESTINO_AJENO]) {
    escenarios.push({
      nombre: `?${difusion(destino)}`,
      busqueda: `?${difusion(destino)}`,
      esperado: (campo) => deDifusion(campo, destino),
    });
  }
  const [unDestino, otroDestino] = DESTINOS_VALIDOS;
  escenarios.push(
    {
      nombre: `?${difusion(DESTINO_AJENO)}&${difusion(unDestino)} (la ajena primero)`,
      busqueda: `?${difusion(DESTINO_AJENO)}&${difusion(unDestino)}`,
      esperado: () => null,
    },
    {
      nombre: `?${difusion(unDestino)}&${difusion(otroDestino)} (manda la primera)`,
      busqueda: `?${difusion(unDestino)}&${difusion(otroDestino)}`,
      esperado: (campo) => deDifusion(campo, unDestino),
    },
  );
  for (const [red, destino] of [
    [REDES_VALIDAS[0], unDestino],
    [RED_AJENA, otroDestino],
    [REDES_VALIDAS[1], DESTINO_AJENO],
  ] as const) {
    escenarios.push({
      nombre: `?${PARAMETRO_DE_ORIGEN}=${red}&${difusion(destino)}`,
      busqueda: `?${PARAMETRO_DE_ORIGEN}=${red}&${difusion(destino)}`,
      esperado: (campo) =>
        campo === 'origen' && valoresDe('origen').includes(red) ? red : deDifusion(campo, destino),
    });
  }
  // Cada destino conocido —de todos los conjuntos— y uno ajeno, también en los eventos que no
  // declaran destino: ahí no debe salir.
  for (const destino of [...DESTINOS_VALIDOS, DESTINO_AJENO]) {
    escenarios.push({
      nombre: `destino ${destino}`,
      destino,
      esperado: (campo) => (campo === 'destino' && valoresDe('destino').includes(destino) ? destino : null),
    });
  }
  escenarios.push({
    nombre: 'con datos',
    datos: 'texto buscado',
    esperado: (campo) => (campo === 'consulta' ? 'texto buscado' : null),
  });
  // Historia 23.7 — cada zona del vocabulario, solo en los eventos que la declaran: la zona no es
  // una marca de la dirección ni un argumento de `__medir`, sino el contenedor del enlace pulsado,
  // y solo la salida interna pulsa uno, así que en los demás eventos el escenario no le daría
  // ninguna entrada. Que no viaje con ellos ya lo dicen sus claves exactas, en todo escenario. Una
  // zona ajena no está: con ella no sale ninguna salida, y eso lo prueba
  // `tests/unit/medicion.test.ts`.
  if (valoresDe('zona').length > 0) {
    for (const zona of ZONAS) {
      escenarios.push({ nombre: `zona ${zona}`, zona, esperado: () => null });
    }
  }
  // Historia 23.8 — cada rótulo de tramo y cada combinación de filtros, solo en los eventos que los
  // declaran: los pasa la isla de `/buscar/` en el segundo y el tercer argumento de `__medir`, que en
  // los demás eventos son la consulta y el destino, y esos ya los recorren sus escenarios. Uno ajeno
  // —un número, un texto, una combinación imposible— viaja nulo.
  if (valoresDe('tramo').length > 0) {
    for (const tramo of [...TRAMOS.map((t) => t.rotulo), '12', DESTINO_AJENO]) {
      escenarios.push({
        nombre: `tramo ${tramo}`,
        tramo,
        esperado: (campo) => (campo === 'tramo' && valoresDe('tramo').includes(tramo) ? tramo : null),
      });
    }
  }
  if (valoresDe('filtros').length > 0) {
    for (const filtros of [...FILTROS, 'obra', DESTINO_AJENO]) {
      escenarios.push({
        nombre: `filtros ${filtros}`,
        filtros,
        esperado: (campo) => (campo === 'filtros' && valoresDe('filtros').includes(filtros) ? filtros : null),
      });
    }
    const [primerTramo] = TRAMOS;
    const ultimo = FILTROS[FILTROS.length - 1];
    escenarios.push({
      nombre: `tramo ${primerTramo.rotulo} y filtros ${ultimo}`,
      tramo: primerTramo.rotulo,
      filtros: ultimo,
      esperado: (campo) => (campo === 'tramo' ? primerTramo.rotulo : campo === 'filtros' ? ultimo : null),
    });
  }
  // `primera` no sale de la entrada: la calcula el fichero, y en la primera acción de cada
  // entorno es «si», salvo la descarga con destino de su conjunto. La `zona` tampoco sale de
  // un argumento: es la del contenedor del enlace pulsado, la del escenario o la de por omisión.
  return escenarios.map((escenario) => ({
    ...escenario,
    esperado: (campo: Campo) =>
      campo === 'primera'
        ? primeraEsperada(evento, escenario.destino)
        : campo === 'zona'
          ? (escenario.zona ?? ZONA_POR_OMISION)
          : escenario.esperado(campo),
  }));
}

describe('Historia 23.2 — la correspondencia: guion, receptor y esquema, evento por evento', () => {
  const columnas = columnasDelEsquema();

  it('el esquema tiene jornada, evento, ruta y una columna por campo', () => {
    expect(columnas).toEqual(['jornada', 'evento', 'ruta', ...CAMPOS]);
  });

  it('lo no pendiente son los diez eventos de hoy, y es lo que el guion emite', () => {
    const vigentes = EVENTOS_VALIDOS.filter((evento) => !eventoPendiente(evento));
    expect([...vigentes].sort()).toEqual(
      [
        EVENTOS.vistaDeCita,
        EVENTOS.vistaDeSuperficie,
        EVENTOS.lectura,
        EVENTOS.salidaInterna,
        EVENTOS.busqueda,
        EVENTOS.copiado,
        EVENTOS.descargaDeImagen,
        EVENTOS.busquedaSinResultados,
        EVENTOS.comparticionDeImagen,
        EVENTOS.comparticionDeEnlace,
      ].sort(),
    );
    expect([...EVENTOS_DEL_GUION].sort()).toEqual([...vigentes].sort());
    // Y los campos que sabe producir son los que algún evento vigente necesita.
    const necesarios = new Set(vigentes.flatMap(camposEsperados));
    expect([...CAMPOS_DEL_GUION].sort()).toEqual([...necesarios].sort());
  });

  it('la salida interna se recorre con cada zona del vocabulario, y ningún otro evento lleva escenarios de zona', () => {
    // Historia 23.7: para que la correspondencia de abajo no pase en vacío con la zona.
    for (const evento of EVENTOS_VALIDOS) {
      const conZona = escenariosDe(evento).flatMap((escenario) => (escenario.zona === undefined ? [] : [escenario.zona]));
      expect(conZona, evento).toEqual(evento === EVENTOS.salidaInterna ? [...ZONAS] : []);
    }
  });

  it('la búsqueda se recorre con cada tramo y cada combinación de filtros, y ningún otro evento lleva escenarios de tramo o filtros', () => {
    // Historia 23.8: para que la correspondencia de abajo no pase en vacío con el tramo y los filtros.
    for (const evento of EVENTOS_VALIDOS) {
      const escenarios = escenariosDe(evento);
      const tramos = escenarios.flatMap((escenario) => (escenario.tramo === undefined ? [] : [escenario.tramo]));
      const filtros = escenarios.flatMap((escenario) => (escenario.filtros === undefined ? [] : [escenario.filtros]));
      if (evento === EVENTOS.busqueda) {
        expect(tramos, evento).toEqual(expect.arrayContaining(TRAMOS.map((t) => t.rotulo)));
        expect(filtros, evento).toEqual(expect.arrayContaining([...FILTROS]));
      } else {
        expect(tramos, evento).toEqual([]);
        expect(filtros, evento).toEqual([]);
      }
    }
  });

  it('dos `busqueda` iguales dan dos balizas: el fichero no descarta ninguna, la regla de una por estado es de la isla', () => {
    const [tramo] = TRAMOS;
    const { emitir, balizas } = medicionEnUnSandbox({ ruta: '/buscar/' });
    emitir(EVENTOS.busqueda, tramo.rotulo, FILTROS[0]);
    emitir(EVENTOS.busqueda, tramo.rotulo, FILTROS[0]);
    const esperada = { evento: EVENTOS.busqueda, ruta: '/buscar/', tramo: tramo.rotulo, filtros: FILTROS[0] };
    expect(balizas()).toEqual([esperada, esperada]);
  });

  it('cada campo pendiente es de un evento que lo declara', () => {
    for (const { historia, campos = [] } of PENDIENTES) {
      for (const [evento, campo] of campos) {
        expect(CAMPOS_DE_EVENTO[evento][campo], `${historia}: ${evento}.${campo}`).toBeDefined();
      }
    }
  });

  it.each(EVENTOS_VALIDOS.filter((evento) => eventoPendiente(evento)))(
    '%s está pendiente: el guion no lo emite, ni de la cola ni directo',
    (evento) => {
      const directo = medicionEnUnSandbox({ busqueda: `?${PARAMETRO_DE_ORIGEN}=${REDES_VALIDAS[0]}` });
      directo.emitir(evento, 'datos', DESTINOS_VALIDOS[0]);
      expect(directo.balizas()).toEqual([]);

      const encolado = medicionEnUnSandbox({ cargado: false });
      encolado.emitir(evento);
      encolado.cargar();
      expect(encolado.balizas()).toEqual([]);
    },
  );

  it.each(EVENTOS_VALIDOS.filter((evento) => !eventoPendiente(evento)))(
    '%s: el guion emite exactamente sus claves, cada valor de su conjunto, y el receptor lo guarda en su columna',
    (evento) => {
      const campos = camposEsperados(evento);
      const claves = ['evento', 'ruta', ...campos.map(claveEnLaBaliza)].sort();

      for (const escenario of escenariosDe(evento)) {
        const enviadas = producir(evento, escenario);
        expect(enviadas, `${evento}, ${escenario.nombre}`).toHaveLength(1);
        const [carga] = enviadas;

        // Exactamente las declaradas menos las pendientes: ni una de más, ni una de menos.
        expect(Object.keys(carga).sort(), `${evento}, ${escenario.nombre}`).toEqual(claves);
        expect(carga.evento).toBe(evento);
        expect(carga.ruta).toBe('/cita/una/');

        for (const campo of campos) {
          const valor = carga[claveEnLaBaliza(campo)];
          const { valores } = CAMPOS_DE_EVENTO[evento][campo]!;
          // De su conjunto, o nulo: con una entrada ajena, o sin entrada.
          expect(valor === null || valores === 'texto' || valores.includes(valor as string)).toBe(true);
          expect(valor, `${evento}.${campo}, ${escenario.nombre}`).toBe(escenario.esperado(campo));
        }

        // El receptor guarda cada valor en su columna, y su registro son las columnas del esquema.
        const registro = interpretar(JSON.stringify(carga), INSTANTE) as Record<string, unknown> | null;
        expect(registro, `${evento}, ${escenario.nombre}`).not.toBeNull();
        for (const campo of campos) {
          expect(registro![campo], `${evento}.${campo} en el registro`).toBe(carga[claveEnLaBaliza(campo)]);
        }
        expect(Object.keys(registro!)).toEqual(columnas);
      }
    },
  );

  it('los campos pendientes no salen en ningún evento vigente', () => {
    for (const evento of EVENTOS_VALIDOS.filter((e) => !eventoPendiente(e))) {
      const [carga] = producir(evento, { busqueda: `?${PARAMETRO_DE_DIFUSION}=${DESTINOS_VALIDOS[0]}` });
      expect(carga, evento).toBeDefined();
      for (const campo of Object.keys(CAMPOS_DE_EVENTO[evento]) as Campo[]) {
        if (campoPendiente(evento, campo)) expect(carga, `${evento}.${campo}`).not.toHaveProperty(claveEnLaBaliza(campo));
      }
    }
  });

  it('la lectura y la salida interna no salen por `__medir`, ni directas ni de la cola: solo las produce el fichero', () => {
    for (const evento of EVENTOS_SOLO_DEL_FICHERO) {
      const directo = medicionEnUnSandbox({ vistas: EVENTOS.vistaDeCita });
      directo.emitir(evento, 'datos', DESTINOS_VALIDOS[0]);
      expect(directo.balizas().map((b) => b.evento), evento).toEqual([EVENTOS.vistaDeCita]);

      const encolado = medicionEnUnSandbox({ vistas: EVENTOS.vistaDeCita, cargado: false });
      encolado.emitir(evento);
      encolado.cargar();
      expect(encolado.balizas().map((b) => b.evento), evento).toEqual([EVENTOS.vistaDeCita]);
    }
  });
});
