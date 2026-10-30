import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  AUTOR_VALIDO,
  RAIZ,
  TEMA_VALIDO,
  citaValida,
  construirConCorpus,
  limpiar,
  paginaConstruida,
} from './ayuda/construir.js';
import { indiceDe, type IndiceDePagefind } from './ayuda/pagefind.ts';
import { etiquetasDeGuionExterno, guionesEjecutables, guionesEnLinea } from './ayuda/guion.js';
import { recorrerElementos } from '../../tools/lib/html.ts';
import { conjuntoDelCorpus } from '../../tools/lib/alcance.ts';
import { rutasDelCorpus } from '../../tools/lib/corpus.ts';
import {
  CLAVE_DEL_ESTADO_EN_LA_ENTRADA,
  EJEMPLO_DE_LA_BUSQUEDA,
  ESTADO_VACIO,
  ETIQUETA_DE_LA_BUSQUEDA,
  ANUNCIO_DEL_FALLO_DE_LA_BUSQUEDA,
  AVISO_DEL_FALLO,
  AVISO_PREVIO,
  AVISO_SIN_GUION,
  FALLO_DE_LA_TANDA,
  PARAMETROS_DE_LA_BUSQUEDA,
  RUTA_DEL_MAPA_DE_OBRAS,
  SUGERENCIA_SIN_FILTROS,
  TEXTO_DE_EJEMPLO_DE_LA_BUSQUEDA,
  VOLVER_ATRAS_A_LAS_CITAS,
  autorDeLaObra,
  avisoDeLaDireccion,
  combinacionDeFiltros,
  direccionDeLaBusqueda,
  entradaConEstado,
  escrituraDelHistorial,
  estadoDeLaDireccion,
  estadoDeLaEntrada,
  estadoSinNada,
  mismoEstado,
  resolverEstado,
  type ControlDeLaBusqueda,
  type EstadoDeLaBusqueda,
  filtrosDePagefind,
  fraseDelRecuento,
  hayFiltros,
  opcionesDeObra,
  rotuloDeMostrarMas,
  rotuloDeObra,
  sugerenciaSinResultados,
  valoresDeFiltros,
  type MapaDeObras,
} from '../../src/lib/busqueda.ts';
import { filtrosDeLaBusqueda } from '../../src/lib/publicado.ts';
import { MAPA_DE_OBRAS_EN_DIST } from '../../tools/lib/peso.ts';
import { EXENCIONES_DE_ZONA, MARCA_DE_BUSQUEDA_ASENTADA } from '../../src/lib/medicion.ts';
import { rutaDeLaBusqueda, rutaDelDirectorioDeAutores, rutaDelDirectorioDeObras } from '../../src/lib/superficies.ts';
import { NOMBRE_DEL_DIRECTORIO_DE_AUTORES, NOMBRE_DEL_DIRECTORIO_DE_OBRAS } from '../../src/lib/marca.ts';
import { guionExternoDe } from '../../src/lib/guiones.ts';
import { ARRANQUE_DE_MEDICION, rutaDelGuionDeMedicion } from '../../src/lib/medicion.ts';
import {
  claveDeComparacion,
  normalizar,
  ordenDeAutoresPorNombre,
  ordenDeTemasPorNombre,
} from '../../src/lib/normalizar.ts';
import { recuentoDeCitas, temaEnFrase } from '../../src/lib/recuentos.ts';
import {
  recuentoDeCitas as recuentoDeCitasDeAtribucion,
  temaEnFrase as temaEnFraseDeAtribucion,
} from '../../src/lib/atribucion.ts';
import { ETIQUETAS_DE_RESULTADO, FILTROS_DE_CITA, FILTRO_DE_TIPO, ORDEN_DE_CITA } from '../../src/lib/tipoDeResultado.ts';
import { MIN_CITAS_POR_TEMA, TANDA_DE_RESULTADOS } from '../../src/lib/umbrales.ts';
import { decodificar } from './ayuda/listado.ts';

/**
 * Historia 27.2 — la búsqueda se acota por Autor y por Tema.
 *
 * Tres partes, como la historia:
 *
 *   · lo **puro** de `src/lib/busqueda.ts` —la frase del recuento, los `filters` de Pagefind, la
 *     combinación que viaja en la `busqueda` y los valores de su clave— y las dos órdenes nuevas de
 *     `src/lib/normalizar.ts` para los selectores;
 *   · el **Corpus en disco**: el ejemplo del campo («no hay camino») tiene que dar resultados;
 *   · lo **construido**: `/buscar/` sin guion propio en línea, con el fichero de la búsqueda detrás
 *     del de medición y la plantilla con sus dos selectores; y el índice que Pagefind generó, que
 *     con `filters` (y `search(null)` ordenado por la clave) da justo las Citas de lo filtrado.
 *
 * Lo que la isla **hace** —cuándo busca, qué pinta, qué anuncia y qué asienta— lo prueba el entorno
 * simulado en `tests/unit/medicion.test.ts`, ejecutando este mismo fichero de `dist/`.
 */

describe('Historia 27.2 — lo puro: la frase del recuento', () => {
  it('sin filtros, la de siempre, con el total', () => {
    expect(fraseDelRecuento({ total: 28, texto: 'vida' })).toBe('28 resultados.');
    expect(fraseDelRecuento({ total: 1, texto: 'vida' })).toBe('Un resultado.');
  });

  it('con filtros nombra lo filtrado: Autor, Tema en minúscula y el texto recortado entre comillas', () => {
    expect(fraseDelRecuento({ total: 222, texto: '', autor: 'José Martí' })).toBe('222 citas de José Martí.');
    expect(fraseDelRecuento({ total: 8, texto: '   ', autor: 'José Martí', tema: 'La prudencia' })).toBe(
      '8 citas de José Martí sobre la prudencia.',
    );
    expect(fraseDelRecuento({ total: 6, texto: ' escuela ', tema: 'El saber' })).toBe('6 citas sobre el saber con «escuela».');
    expect(fraseDelRecuento({ total: 3, texto: 'vida', autor: 'Séneca', tema: 'El tiempo' })).toBe(
      '3 citas de Séneca sobre el tiempo con «vida».',
    );
  });

  it('en singular, «Una cita»', () => {
    expect(fraseDelRecuento({ total: 1, texto: '', autor: 'Séneca' })).toBe('Una cita de Séneca.');
    expect(fraseDelRecuento({ total: 1, texto: 'x', tema: 'La vida' })).toBe('Una cita sobre la vida con «x».');
  });

  it('el Tema pasa por `temaEnFrase`, que vive en `recuentos.ts` y `atribucion.ts` reexporta: una sola regla', () => {
    expect(temaEnFraseDeAtribucion).toBe(temaEnFrase);
    expect(fraseDelRecuento({ total: 2, texto: '', tema: 'Ñandú' })).toBe(`2 citas sobre ${temaEnFrase('Ñandú')}.`);
    const fuente = readFileSync(join(RAIZ, 'src/lib/recuentos.ts'), 'utf8');
    expect(fuente).not.toMatch(/^import\b/mu);
  });

  it('el guion de la búsqueda solo arrastra módulos aptos para el cliente: su grafo de importaciones es esta lista', () => {
    // Lo que el `<script>` de `Busqueda.astro` importa con valor, y lo que eso importa, hasta el final.
    // `import type` no viaja. Un módulo nuevo en la lista —`superficies.ts`, `publicado.ts`…— se
    // decide aquí, a la vista, y no se descubre como bytes de más en el tope.
    const IMPORTA = /^\s*(?:import|export)\s+(?!type\b)[^;]*?from\s+'(\.[^']+)'/gmu;
    const componente = readFileSync(join(RAIZ, 'src/components/Busqueda.astro'), 'utf8');
    const guion = componente.slice(componente.indexOf('\n<script>'));
    expect(guion.length).toBeLessThan(componente.length);
    const vistos = new Set<string>();
    const cola = [...guion.matchAll(IMPORTA)].map((m) => join(RAIZ, 'src/components', m[1]));
    while (cola.length > 0) {
      const fichero = cola.shift()!;
      if (vistos.has(fichero)) continue;
      vistos.add(fichero);
      for (const m of readFileSync(fichero, 'utf8').matchAll(IMPORTA)) cola.push(join(fichero, '..', m[1]));
    }
    expect([...vistos].map((f) => f.slice(RAIZ.length + 1)).sort()).toEqual([
      'src/lib/anuncio.ts',
      'src/lib/busqueda.ts',
      'src/lib/destinos.ts',
      'src/lib/medicion.ts',
      'src/lib/recuentos.ts',
      'src/lib/redes.ts',
      'src/lib/tipoDeResultado.ts',
      'src/lib/umbrales.ts',
      'src/lib/vocabulario.ts',
    ]);
  });

  it('lo tecleado va tal cual: la frase no escapa nada porque se pinta por `textContent`', () => {
    expect(fraseDelRecuento({ total: 2, texto: '<b>vida</b>', autor: 'Séneca' })).toBe('2 citas de Séneca con «<b>vida</b>».');
  });

  it('Historia 27.6 — el recuento con Obra no cambia al compartir la composición con la frase a cero', () => {
    expect(fraseDelRecuento({ total: 23, texto: '', autor: 'José Martí', obra: 'Maestros ambulantes' })).toBe(
      '23 citas de José Martí en Maestros ambulantes.',
    );
    expect(fraseDelRecuento({ total: 1, texto: 'x', autor: 'José Martí', obra: '¡Adentro!' })).toBe(
      'Una cita de José Martí en ¡Adentro! con «x».',
    );
    expect(fraseDelRecuento({ total: 2, texto: '', autor: 'José Martí', obra: '¡Adentro!' })).toBe('2 citas de José Martí en ¡Adentro!');
    expect(fraseDelRecuento({ total: 2, texto: '', tema: 'La vida', obra: 'Sin Autor' })).toBe('2 citas sobre la vida.');
  });
});

describe('Historia 27.6 — lo puro: la frase a cero', () => {
  it('sin Autor ni Tema, la de siempre, la misma constante que pinta el build', () => {
    expect(SUGERENCIA_SIN_FILTROS).toBe('No encontramos esa frase. Prueba con menos palabras.');
    expect(sugerenciaSinResultados({ texto: 'zzz' })).toBe(SUGERENCIA_SIN_FILTROS);
    expect(sugerenciaSinResultados({ texto: '' })).toBe(SUGERENCIA_SIN_FILTROS);
    // Una Obra sin su Autor no es filtro que nombrar.
    expect(sugerenciaSinResultados({ texto: 'zzz', obra: 'Maestros ambulantes' })).toBe(SUGERENCIA_SIN_FILTROS);
  });

  it('con filtros y texto: qué no se encontró y entre qué citas, en el orden del recuento', () => {
    expect(
      sugerenciaSinResultados({ texto: 'escuela', autor: 'José Martí', obra: 'Maestros ambulantes' }),
    ).toBe('No encontramos «escuela» entre las citas de José Martí en Maestros ambulantes.');
    expect(sugerenciaSinResultados({ texto: '  zzz nada ', autor: 'José Martí' })).toBe(
      'No encontramos «zzz nada» entre las citas de José Martí.',
    );
    expect(sugerenciaSinResultados({ texto: 'zzz', tema: 'La prudencia' })).toBe(
      'No encontramos «zzz» entre las citas sobre la prudencia.',
    );
    expect(sugerenciaSinResultados({ texto: 'zzz', autor: 'Séneca', obra: 'Cartas', tema: 'El tiempo' })).toBe(
      'No encontramos «zzz» entre las citas de Séneca en Cartas sobre el tiempo.',
    );
  });

  it('con filtros y sin texto —vacío o solo espacios—: «No hay citas…»', () => {
    expect(sugerenciaSinResultados({ texto: '', autor: 'José Martí', tema: 'La prudencia' })).toBe(
      'No hay citas de José Martí sobre la prudencia.',
    );
    expect(sugerenciaSinResultados({ texto: '   ', autor: 'José Martí', obra: 'Maestros ambulantes', tema: 'La prudencia' })).toBe(
      'No hay citas de José Martí en Maestros ambulantes sobre la prudencia.',
    );
    expect(sugerenciaSinResultados({ texto: '', tema: 'Ñandú' })).toBe(`No hay citas sobre ${temaEnFrase('Ñandú')}.`);
  });

  it('la Obra sin Autor o con título vacío no se nombra; un título que cierra con «!» no lleva otro punto', () => {
    expect(sugerenciaSinResultados({ texto: '', tema: 'La vida', obra: 'Maestros ambulantes' })).toBe('No hay citas sobre la vida.');
    expect(sugerenciaSinResultados({ texto: '', autor: 'José Martí', obra: '  ' })).toBe('No hay citas de José Martí.');
    expect(sugerenciaSinResultados({ texto: '', autor: 'José Martí', obra: '¡Adentro!' })).toBe('No hay citas de José Martí en ¡Adentro!');
    expect(sugerenciaSinResultados({ texto: 'zzz', autor: 'José Martí', obra: '¿Quién?' })).toBe(
      'No encontramos «zzz» entre las citas de José Martí en ¿Quién?',
    );
  });

  it('lo tecleado entra tal cual, recortado y sin escapar: se pinta por `textContent`', () => {
    expect(sugerenciaSinResultados({ texto: ' <b>zzz</b> ', autor: 'Séneca' })).toBe(
      'No encontramos «<b>zzz</b>» entre las citas de Séneca.',
    );
  });
});

describe('Historia 27.2 — lo puro: los filtros', () => {
  const NADA = { autor: '', tema: '' };

  it('`filters` de Pagefind: solo lo elegido, con los nombres de la 27.1', () => {
    expect(filtrosDePagefind(NADA)).toEqual({});
    expect(filtrosDePagefind({ autor: 'jose-marti', tema: '' })).toEqual({ [FILTROS_DE_CITA.autor]: 'jose-marti' });
    expect(filtrosDePagefind({ autor: '', tema: 'la-prudencia' })).toEqual({ [FILTROS_DE_CITA.tema]: 'la-prudencia' });
    expect(filtrosDePagefind({ autor: 'jose-marti', tema: 'la-prudencia' })).toEqual({
      [FILTROS_DE_CITA.autor]: 'jose-marti',
      [FILTROS_DE_CITA.tema]: 'la-prudencia',
    });
  });

  it('la combinación del vocabulario y los valores de la clave', () => {
    expect(hayFiltros(NADA)).toBe(false);
    expect(combinacionDeFiltros(NADA)).toBe('ninguno');
    expect(combinacionDeFiltros({ autor: 'a', tema: '' })).toBe('autor');
    expect(combinacionDeFiltros({ autor: '', tema: 't' })).toBe('tema');
    expect(combinacionDeFiltros({ autor: 'a', tema: 't' })).toBe('autor-tema');
    expect(valoresDeFiltros(NADA)).toBeUndefined();
    expect(valoresDeFiltros({ autor: 'a', tema: '' })).not.toBe(valoresDeFiltros({ autor: '', tema: 'a' }));
    expect(valoresDeFiltros({ autor: 'jose-marti', tema: '' })).not.toBe(valoresDeFiltros({ autor: 'seneca', tema: '' }));
  });

  it('los textos fijos del campo', () => {
    expect(ETIQUETA_DE_LA_BUSQUEDA).toBe('Escribe un fragmento, un autor o un tema.');
    expect(TEXTO_DE_EJEMPLO_DE_LA_BUSQUEDA).toBe('Por ejemplo: no hay camino');
    expect(EJEMPLO_DE_LA_BUSQUEDA).toBe('no hay camino');
  });
});

describe('Historia 27.3 — lo puro: la Obra', () => {
  const NADA = { autor: '', tema: '' };

  it('el recuento nombra la Obra por su título, entre el Autor y el Tema', () => {
    expect(fraseDelRecuento({ total: 23, texto: '', autor: 'José Martí', obra: 'Maestros ambulantes' })).toBe(
      '23 citas de José Martí en Maestros ambulantes.',
    );
    expect(
      fraseDelRecuento({ total: 1, texto: '', autor: 'José Martí', obra: 'Maestros ambulantes', tema: 'La prudencia' }),
    ).toBe('Una cita de José Martí en Maestros ambulantes sobre la prudencia.');
    expect(
      fraseDelRecuento({ total: 4, texto: ' escuela ', autor: 'José Martí', obra: 'Maestros ambulantes', tema: 'El saber' }),
    ).toBe('4 citas de José Martí en Maestros ambulantes sobre el saber con «escuela».');
    // El singular sin Tema ni texto.
    expect(fraseDelRecuento({ total: 1, texto: '', autor: 'José Martí', obra: 'Maestros ambulantes' })).toBe(
      'Una cita de José Martí en Maestros ambulantes.',
    );
  });

  it('un título que ya cierra la frase no lleva otro punto detrás', () => {
    expect(fraseDelRecuento({ total: 3, texto: '', autor: 'Pío Baroja', obra: '¡Adentro!' })).toBe('3 citas de Pío Baroja en ¡Adentro!');
    expect(fraseDelRecuento({ total: 1, texto: '', autor: 'X', obra: '¿Qué es la patria?' })).toBe('Una cita de X en ¿Qué es la patria?');
    expect(fraseDelRecuento({ total: 2, texto: '', autor: 'X', obra: 'Obras completas. Tomo I.' })).toBe(
      '2 citas de X en Obras completas. Tomo I.',
    );
    // Lo que va detrás del título cierra con su propio punto.
    expect(fraseDelRecuento({ total: 2, texto: '', autor: 'X', obra: '¡Adentro!', tema: 'La vida' })).toBe(
      '2 citas de X en ¡Adentro! sobre la vida.',
    );
    expect(fraseDelRecuento({ total: 2, texto: 'mar', autor: 'X', obra: '¡Adentro!' })).toBe('2 citas de X en ¡Adentro! con «mar».');
  });

  it('la Obra no se nombra sin su Autor, ni con un título vacío: nunca «… en .»', () => {
    expect(fraseDelRecuento({ total: 23, texto: '', autor: 'José Martí', obra: '' })).toBe('23 citas de José Martí.');
    expect(fraseDelRecuento({ total: 23, texto: '', autor: 'José Martí', obra: '  ' })).toBe('23 citas de José Martí.');
    expect(fraseDelRecuento({ total: 2, texto: '', obra: 'Cartas', tema: 'La vida' })).toBe('2 citas sobre la vida.');
    expect(fraseDelRecuento({ total: 2, texto: 'x', obra: 'Cartas' })).toBe('2 resultados.');
  });

  it('`filters` con Obra; la Obra sin Autor no cuenta en nada', () => {
    const conObra = { autor: 'jose-marti', obra: 'jose-marti--maestros-ambulantes', tema: '' };
    expect(filtrosDePagefind(conObra)).toEqual({
      [FILTROS_DE_CITA.autor]: 'jose-marti',
      [FILTROS_DE_CITA.obra]: 'jose-marti--maestros-ambulantes',
    });
    expect(filtrosDePagefind({ ...conObra, tema: 'la-prudencia' })).toEqual({
      [FILTROS_DE_CITA.autor]: 'jose-marti',
      [FILTROS_DE_CITA.obra]: 'jose-marti--maestros-ambulantes',
      [FILTROS_DE_CITA.tema]: 'la-prudencia',
    });
    const sinAutor = { autor: '', obra: 'jose-marti--maestros-ambulantes', tema: '' };
    expect(filtrosDePagefind(sinAutor)).toEqual({});
    expect(hayFiltros(sinAutor)).toBe(false);
    expect(combinacionDeFiltros(sinAutor)).toBe('ninguno');
    expect(valoresDeFiltros(sinAutor)).toBeUndefined();
    // Una Obra vacía es «Todas sus obras».
    expect(filtrosDePagefind({ autor: 'jose-marti', obra: '', tema: '' })).toEqual({ [FILTROS_DE_CITA.autor]: 'jose-marti' });
  });

  it('la combinación con Obra es `autor-obra` o `autor-obra-tema`, y los valores `autor|tema|obra`', () => {
    expect(combinacionDeFiltros({ autor: 'a', obra: 'a--o', tema: '' })).toBe('autor-obra');
    expect(combinacionDeFiltros({ autor: 'a', obra: 'a--o', tema: 't' })).toBe('autor-obra-tema');
    expect(combinacionDeFiltros({ autor: 'a', obra: '', tema: 't' })).toBe('autor-tema');
    expect(valoresDeFiltros({ autor: 'a', tema: 't' })).toBe('a|t');
    expect(valoresDeFiltros({ autor: 'a', obra: '', tema: 't' })).toBe('a|t');
    expect(valoresDeFiltros({ autor: 'a', obra: 'a--o', tema: '' })).toBe('a||a--o');
    expect(valoresDeFiltros({ autor: 'a', obra: 'a--o', tema: 't' })).toBe('a|t|a--o');
    expect(valoresDeFiltros({ autor: 'a', obra: 'a--o', tema: '' })).not.toBe(valoresDeFiltros({ autor: 'a', obra: 'a--p', tema: '' }));
    expect(valoresDeFiltros(NADA)).toBeUndefined();
  });

  const MAPA: MapaDeObras = {
    'jose-marti': [
      ['jose-marti--maestros-ambulantes', 'Maestros ambulantes'],
      ['jose-marti--cartas', 'Cartas'],
      ['jose-marti--nuestra-america', 'Nuestra América'],
    ],
    seneca: [['seneca--cartas', 'Cartas']],
  };

  it('`opcionesDeObra`: las del Autor en el orden del mapa, aunque los recuentos digan otro', () => {
    const recuentos = { 'jose-marti--maestros-ambulantes': 2, 'jose-marti--cartas': 23, 'jose-marti--nuestra-america': 1, 'seneca--cartas': 9 };
    expect(opcionesDeObra(MAPA, recuentos, 'jose-marti')).toEqual([
      { valor: 'jose-marti--maestros-ambulantes', titulo: 'Maestros ambulantes', recuento: 2 },
      { valor: 'jose-marti--cartas', titulo: 'Cartas', recuento: 23 },
      { valor: 'jose-marti--nuestra-america', titulo: 'Nuestra América', recuento: 1 },
    ]);
    // Homónimas: cada Autor, solo la suya.
    expect(opcionesDeObra(MAPA, recuentos, 'seneca')).toEqual([{ valor: 'seneca--cartas', titulo: 'Cartas', recuento: 9 }]);
  });

  it('`opcionesDeObra`: la que falta en el mapa o en los recuentos —o cuenta cero— se omite, en los dos sentidos', () => {
    // `filters()` no trae «Cartas» (otro despliegue) y trae una que el mapa no nombra.
    const recuentos = { 'jose-marti--maestros-ambulantes': 2, 'jose-marti--nuestra-america': 0, 'jose-marti--ismaelillo': 4 };
    expect(opcionesDeObra(MAPA, recuentos, 'jose-marti').map((o) => o.valor)).toEqual(['jose-marti--maestros-ambulantes']);
  });

  it('`opcionesDeObra`: sin Autor, sin Autor en el mapa, sin recuentos o con un mapa mal formado, ninguna', () => {
    const recuentos = { 'jose-marti--cartas': 1 };
    expect(opcionesDeObra(MAPA, recuentos, '')).toEqual([]);
    expect(opcionesDeObra(MAPA, recuentos, 'amado-nervo')).toEqual([]);
    expect(opcionesDeObra(MAPA, {}, 'jose-marti')).toEqual([]);
    expect(opcionesDeObra(MAPA, undefined, 'jose-marti')).toEqual([]);
    expect(opcionesDeObra(MAPA, recuentos, 'constructor')).toEqual([]);
    const raro = { 'jose-marti': [['jose-marti--cartas'], 'x', ['jose-marti--cartas', 'Cartas']] } as unknown as MapaDeObras;
    expect(opcionesDeObra(raro, recuentos, 'jose-marti')).toEqual([{ valor: 'jose-marti--cartas', titulo: 'Cartas', recuento: 1 }]);
    expect(opcionesDeObra({ 'jose-marti': 'no' } as unknown as MapaDeObras, recuentos, 'jose-marti')).toEqual([]);
    // Un nombre o un título vacíos no se ofrecen: ni «Todas sus obras» dos veces ni « (1 cita)».
    const vacios: MapaDeObras = { 'jose-marti': [['', 'Cartas'], ['jose-marti--cartas', '  '], ['jose-marti--ismaelillo', 'Ismaelillo']] };
    expect(opcionesDeObra(vacios, { '': 3, 'jose-marti--cartas': 1, 'jose-marti--ismaelillo': 2 }, 'jose-marti')).toEqual([
      { valor: 'jose-marti--ismaelillo', titulo: 'Ismaelillo', recuento: 2 },
    ]);
  });

  it('el rótulo, «Título (23 citas)» y «(1 cita)», con `recuentoDeCitas`: una sola concordancia', () => {
    expect(rotuloDeObra({ titulo: 'Maestros ambulantes', recuento: 23 })).toBe('Maestros ambulantes (23 citas)');
    expect(rotuloDeObra({ titulo: 'Cartas', recuento: 1 })).toBe('Cartas (1 cita)');
    expect(recuentoDeCitasDeAtribucion).toBe(recuentoDeCitas);
    expect(RUTA_DEL_MAPA_DE_OBRAS).toBe(`/${MAPA_DE_OBRAS_EN_DIST}`);
  });
});

describe('Historia 27.4 — lo puro: la búsqueda en la dirección', () => {
  const RUTA = rutaDeLaBusqueda();
  const estado = (parcial: Partial<EstadoDeLaBusqueda>): EstadoDeLaBusqueda => ({ ...ESTADO_VACIO, ...parcial });
  const MAPA: MapaDeObras = {
    'jose-marti': [
      ['jose-marti--maestros-ambulantes', 'Maestros ambulantes'],
      ['jose-marti--cartas', 'Cartas'],
    ],
    seneca: [['seneca--cartas', 'Cartas']],
  };
  const RECUENTOS = { 'jose-marti--maestros-ambulantes': 23, 'jose-marti--cartas': 1, 'seneca--cartas': 9 };
  const SITIO = {
    autores: ['jose-marti', 'seneca'],
    temas: ['el-saber', 'la-prudencia'],
    autorDeLaObra: (nombre: string) => autorDeLaObra(MAPA, RECUENTOS, nombre),
  };

  it('compone `?q=&autor=&obra=&tema=` en ese orden, solo los no vacíos, con el texto recortado', () => {
    expect(RUTA).toBe('/buscar/');
    expect(Object.values(PARAMETROS_DE_LA_BUSQUEDA)).toEqual(['q', 'autor', 'obra', 'tema']);
    expect(direccionDeLaBusqueda(estado({ texto: '  escuela ', autor: 'jose-marti', tema: 'la-prudencia' }), RUTA)).toBe(
      '/buscar/?q=escuela&autor=jose-marti&tema=la-prudencia',
    );
    expect(
      direccionDeLaBusqueda(estado({ tema: 't', obra: 'a--o', autor: 'a', texto: 'x' }), RUTA),
    ).toBe('/buscar/?q=x&autor=a&obra=a--o&tema=t');
    expect(direccionDeLaBusqueda(ESTADO_VACIO, RUTA)).toBe('/buscar/');
    expect(direccionDeLaBusqueda(estado({ texto: '   ' }), RUTA)).toBe('/buscar/');
    expect(direccionDeLaBusqueda(estado({ texto: 'no hay camino' }), RUTA)).toBe('/buscar/?q=no+hay+camino');
  });

  it('la Obra solo va con su Autor: sin `autor`, la `obra` no se compone', () => {
    expect(direccionDeLaBusqueda(estado({ obra: 'jose-marti--cartas' }), RUTA)).toBe('/buscar/');
    expect(direccionDeLaBusqueda(estado({ obra: 'jose-marti--cartas', tema: 't' }), RUTA)).toBe('/buscar/?tema=t');
    // Componen igual, pero no son el mismo estado: la dirección que trae la `obra` se reemplaza.
    expect(mismoEstado(estado({ obra: 'x' }), ESTADO_VACIO)).toBe(false);
  });

  it('lee la primera aparición de cada uno, vacío es ausente, y lo demás —`de`, `via`, otros— no se lee', () => {
    expect(estadoDeLaDireccion('?q=a&q=b&autor=&tema=t&tema=u&de=instagram&via=x&otra=1')).toEqual(
      estado({ texto: 'a', tema: 't' }),
    );
    expect(estadoDeLaDireccion('')).toEqual(ESTADO_VACIO);
    expect(estadoDeLaDireccion('autor=seneca')).toEqual(estado({ autor: 'seneca' }));
    expect(estadoDeLaDireccion('?q=no+hay%20camino')).toEqual(estado({ texto: 'no hay camino' }));
    // Una composición nunca lleva las marcas de llegada, traiga lo que traiga lo leído.
    const leido = estadoDeLaDireccion('?q=x&de=tiktok&via=whatsapp&autor=a');
    expect(direccionDeLaBusqueda(leido, RUTA)).toBe('/buscar/?q=x&autor=a');
  });

  it('ida y vuelta: leer lo compuesto da el mismo estado, también con caracteres que se codifican', () => {
    for (const e of [
      estado({ texto: 'vida', autor: 'jose-marti', obra: 'jose-marti--maestros-ambulantes', tema: 'la-prudencia' }),
      estado({ texto: '¿Qué & = ? # «sí»+más' }),
      estado({ texto: '<img src=x onerror=alert(1)>', autor: 'a' }),
      estado({ tema: 'el-saber' }),
      ESTADO_VACIO,
    ]) {
      const direccion = direccionDeLaBusqueda(e, RUTA);
      const leido = estadoDeLaDireccion(direccion.slice(RUTA.length));
      expect(mismoEstado(leido, e), direccion).toBe(true);
      expect(leido, direccion).toEqual(e);
    }
  });

  it('`mismoEstado`: el texto se compara recortado; los filtros, exactos', () => {
    expect(mismoEstado(estado({ texto: ' vida ' }), estado({ texto: 'vida' }))).toBe(true);
    expect(mismoEstado(estado({ texto: 'Vida' }), estado({ texto: 'vida' }))).toBe(false);
    expect(mismoEstado(estado({ autor: 'a' }), estado({ autor: 'b' }))).toBe(false);
    expect(mismoEstado(estado({ autor: 'a', obra: 'x' }), estado({ autor: 'a' }))).toBe(false);
    expect(estadoSinNada(estado({ texto: '  ' }))).toBe(true);
    expect(estadoSinNada(estado({ obra: 'x' }))).toBe(false);
  });

  it('el objeto de la entrada: con los nombres de los parámetros, sin mutar el que había y conservando la marca', () => {
    const conMarca = Object.freeze({ [MARCA_DE_BUSQUEDA_ASENTADA]: true, otra: 1 });
    const escrito = entradaConEstado(conMarca, estado({ texto: ' vida ', autor: 'a', obra: 'a--o' }));
    expect(escrito).toEqual({
      [MARCA_DE_BUSQUEDA_ASENTADA]: true,
      otra: 1,
      [CLAVE_DEL_ESTADO_EN_LA_ENTRADA]: { q: 'vida', autor: 'a', obra: 'a--o' },
    });
    expect(conMarca).toEqual({ [MARCA_DE_BUSQUEDA_ASENTADA]: true, otra: 1 });
    expect(entradaConEstado(null, ESTADO_VACIO)).toEqual({ [CLAVE_DEL_ESTADO_EN_LA_ENTRADA]: {} });
    expect(entradaConEstado('x', estado({ tema: 't' }))).toEqual({ [CLAVE_DEL_ESTADO_EN_LA_ENTRADA]: { tema: 't' } });
    // Y se lee de vuelta.
    expect(estadoDeLaEntrada(escrito)).toEqual(estado({ texto: 'vida', autor: 'a', obra: 'a--o' }));
    expect(estadoDeLaEntrada({ [CLAVE_DEL_ESTADO_EN_LA_ENTRADA]: {} })).toEqual(ESTADO_VACIO);
  });

  it('`estadoDeLaEntrada`: lo que no tiene la forma no se lee', () => {
    for (const malo of [
      null,
      undefined,
      'x',
      1,
      {},
      { [MARCA_DE_BUSQUEDA_ASENTADA]: true },
      { [CLAVE_DEL_ESTADO_EN_LA_ENTRADA]: null },
      { [CLAVE_DEL_ESTADO_EN_LA_ENTRADA]: 'q=vida' },
      { [CLAVE_DEL_ESTADO_EN_LA_ENTRADA]: ['vida'] },
      { [CLAVE_DEL_ESTADO_EN_LA_ENTRADA]: { q: 1 } },
      { [CLAVE_DEL_ESTADO_EN_LA_ENTRADA]: { texto: 'vida' } },
      { [CLAVE_DEL_ESTADO_EN_LA_ENTRADA]: { q: 'vida', de: 'tiktok' } },
    ]) {
      expect(estadoDeLaEntrada(malo), JSON.stringify(malo)).toBeNull();
    }
  });

  it('`autorDeLaObra`: el Autor en cuya lista está y que la ofrece; nunca partiendo el nombre', () => {
    expect(autorDeLaObra(MAPA, RECUENTOS, 'jose-marti--cartas')).toBe('jose-marti');
    expect(autorDeLaObra(MAPA, RECUENTOS, 'seneca--cartas')).toBe('seneca');
    // Con forma de ser de un Autor, pero en ninguna lista: no tiene Autor.
    expect(autorDeLaObra(MAPA, RECUENTOS, 'jose-marti--ismaelillo')).toBeNull();
    // En una lista que no es la de su prefijo: es de quien la lista.
    expect(autorDeLaObra({ seneca: [['jose-marti--rara', 'Rara']] }, { 'jose-marti--rara': 2 }, 'jose-marti--rara')).toBe('seneca');
    // Sin Citas en el índice, no es ofrecible.
    expect(autorDeLaObra(MAPA, { ...RECUENTOS, 'jose-marti--cartas': 0 }, 'jose-marti--cartas')).toBeNull();
    expect(autorDeLaObra(MAPA, undefined, 'jose-marti--cartas')).toBeNull();
    expect(autorDeLaObra(MAPA, RECUENTOS, '')).toBeNull();
  });

  it('resolución en orden fijo: descartar lo que no existe, la Obra sin Autor toma el suyo, y si no casan se va la Obra', () => {
    expect(resolverEstado(estado({ texto: 'v', autor: 'jose-marti', tema: 'el-saber' }), SITIO)).toEqual({
      estado: estado({ texto: 'v', autor: 'jose-marti', tema: 'el-saber' }),
      noSeUsan: 0,
    });
    // `obra` sin `autor`.
    expect(resolverEstado(estado({ obra: 'jose-marti--cartas' }), SITIO)).toEqual({
      estado: estado({ autor: 'jose-marti', obra: 'jose-marti--cartas' }),
      noSeUsan: 0,
    });
    // `obra` de otro: nunca se cambia el Autor por el de la Obra.
    expect(resolverEstado(estado({ autor: 'seneca', obra: 'jose-marti--cartas' }), SITIO)).toEqual({
      estado: estado({ autor: 'seneca' }),
      noSeUsan: 1,
    });
    // Autor muerto y Obra viva: la Obra con su Autor.
    expect(resolverEstado(estado({ autor: 'nadie', obra: 'jose-marti--cartas' }), SITIO)).toEqual({
      estado: estado({ autor: 'jose-marti', obra: 'jose-marti--cartas' }),
      noSeUsan: 1,
    });
    // Dos y tres descartes, con texto.
    expect(resolverEstado(estado({ texto: 'vida', autor: 'x', tema: 'y' }), SITIO)).toEqual({
      estado: estado({ texto: 'vida' }),
      noSeUsan: 2,
    });
    expect(resolverEstado(estado({ texto: 'vida', autor: 'x', obra: 'x--o', tema: 'y' }), SITIO)).toEqual({
      estado: estado({ texto: 'vida' }),
      noSeUsan: 3,
    });
    // Una Obra cuyo Autor no es opción del selector (datos de otra construcción) no se ofrece.
    expect(resolverEstado(estado({ obra: 'jose-marti--cartas' }), { ...SITIO, autores: ['seneca'] })).toEqual({
      estado: estado({}),
      noSeUsan: 1,
    });
    // Una Obra absorbida al reunir —fuera del mapa— no se traduce a la que la absorbió.
    expect(resolverEstado(estado({ autor: 'jose-marti', obra: 'jose-marti--maestros' }), SITIO)).toEqual({
      estado: estado({ autor: 'jose-marti' }),
      noSeUsan: 1,
    });
    // El texto no se toca, y sin Obra no se pregunta por su Autor.
    let preguntas = 0;
    resolverEstado(estado({ texto: '  x ', autor: 'seneca' }), {
      ...SITIO,
      autorDeLaObra: () => {
        preguntas++;
        return null;
      },
    });
    expect(preguntas).toBe(0);
    expect(resolverEstado(estado({ texto: '  x ' }), SITIO).estado.texto).toBe('  x ');
  });

  it('las frases fijas, en singular y en plural, y las dos de «ya no existe»', () => {
    expect(avisoDeLaDireccion(0, true)).toBe('');
    expect(avisoDeLaDireccion(0, false)).toBe('');
    expect(avisoDeLaDireccion(1, true)).toBe('Uno de los filtros de esta dirección no se puede usar, y la búsqueda va sin él.');
    expect(avisoDeLaDireccion(2, true)).toBe('Dos de los filtros de esta dirección no se pueden usar, y la búsqueda va sin ellos.');
    expect(avisoDeLaDireccion(3, true)).toBe('Tres de los filtros de esta dirección no se pueden usar, y la búsqueda va sin ellos.');
    expect(avisoDeLaDireccion(1, false)).toBe('El filtro de esta dirección ya no existe.');
    expect(avisoDeLaDireccion(2, false)).toBe('Los filtros de esta dirección ya no existen.');
    expect(avisoDeLaDireccion(3, false)).toBe('Los filtros de esta dirección ya no existen.');
  });

  it('`pushState`, `replaceState` o nada: reemplaza solo la entrada que abrió el mismo control', () => {
    const CONTROLES: ControlDeLaBusqueda[] = ['campo', 'selector-de-autor', 'selector-de-obra', 'selector-de-tema', 'quitar'];
    for (const control of CONTROLES) {
      expect(escrituraDelHistorial({ igual: true, control, controlDeLaEntrada: control })).toBe('ninguna');
      expect(escrituraDelHistorial({ igual: true, control, controlDeLaEntrada: null })).toBe('ninguna');
      expect(escrituraDelHistorial({ igual: false, control, controlDeLaEntrada: control })).toBe('replaceState');
      expect(escrituraDelHistorial({ igual: false, control, controlDeLaEntrada: null })).toBe('pushState');
      for (const otro of CONTROLES.filter((c) => c !== control)) {
        expect(escrituraDelHistorial({ igual: false, control, controlDeLaEntrada: otro }), `${control} tras ${otro}`).toBe('pushState');
      }
    }
  });
});

describe('Historia 27.5 — lo puro: el rótulo de la tanda siguiente y la frase de su fallo', () => {
  it('la tanda es 30, y su único dueño es `umbrales.ts`', () => {
    expect(TANDA_DE_RESULTADOS).toBe(30);
  });

  it('una tanda entera o más, «Mostrar 30 más»; menos, la última nombrada; ninguna, sin botón', () => {
    expect(rotuloDeMostrarMas(0)).toBeNull();
    expect(rotuloDeMostrarMas(-3)).toBeNull();
    expect(rotuloDeMostrarMas(Number.NaN)).toBeNull();
    expect(rotuloDeMostrarMas(1)).toBe('Mostrar la que falta');
    expect(rotuloDeMostrarMas(2)).toBe('Mostrar las 2 que faltan');
    expect(rotuloDeMostrarMas(12)).toBe('Mostrar las 12 que faltan');
    expect(rotuloDeMostrarMas(29)).toBe('Mostrar las 29 que faltan');
    expect(rotuloDeMostrarMas(30)).toBe('Mostrar 30 más');
    expect(rotuloDeMostrarMas(31)).toBe('Mostrar 30 más');
    expect(rotuloDeMostrarMas(222)).toBe(`Mostrar ${TANDA_DE_RESULTADOS} más`);
    expect(rotuloDeMostrarMas(TANDA_DE_RESULTADOS - 1)).toBe(`Mostrar las ${TANDA_DE_RESULTADOS - 1} que faltan`);
  });

  it('la frase del fallo', () => {
    expect(FALLO_DE_LA_TANDA).toBe('No se han podido cargar más resultados.');
  });
});

describe('Historia 27.2 — los órdenes de los selectores', () => {
  const op = (valor: string, rotulo: string) => ({ valor, rotulo });

  it('Autor por el nombre tal como se lee, no por la clave del Directorio: «José Martí» con la J', () => {
    const autores = [op('seneca', 'Séneca'), op('jose-marti', 'José Martí'), op('amado-nervo', 'Amado Nervo')];
    expect(ordenDeAutoresPorNombre(autores).map((a) => a.valor)).toEqual(['amado-nervo', 'jose-marti', 'seneca']);
    // Con la clave del Directorio («Martí», «Nervo») Martí iría antes que Nervo: no es este orden.
    expect(claveDeComparacion('Martí') < claveDeComparacion('Nervo')).toBe(true);
  });

  it('sin tildes, la eñe en su sitio, por unidades de código y desempate por el valor', () => {
    const autores = [op('b', 'Ñuño'), op('c', 'Nuria'), op('a', 'Ángel'), op('z', 'Óscar'), op('d', 'Oscar')];
    expect(ordenDeAutoresPorNombre(autores).map((a) => a.rotulo)).toEqual(['Ángel', 'Nuria', 'Ñuño', 'Oscar', 'Óscar']);
  });

  it('Tema por el nombre con su artículo', () => {
    const temas = [op('la-vida', 'La vida'), op('el-tiempo', 'El tiempo'), op('la-amistad', 'La amistad')];
    expect(ordenDeTemasPorNombre(temas).map((t) => t.valor)).toEqual(['el-tiempo', 'la-amistad', 'la-vida']);
  });

  it('puros y deterministas: el mismo orden ante cualquier permutación, y sin tocar la entrada', () => {
    const autores = [op('b', 'Séneca'), op('a', 'Séneca'), op('c', 'Ángel'), op('d', 'José Martí'), op('e', 'Amado Nervo')];
    const esperado = ordenDeAutoresPorNombre(autores).map((a) => a.valor);
    expect(esperado).toEqual(['e', 'c', 'd', 'a', 'b']);
    const copia = [...autores];
    // Las 120 permutaciones, todas: reproducible, y sin dejar ninguna al azar.
    const permutaciones = <T,>(lista: readonly T[]): T[][] =>
      lista.length <= 1 ? [[...lista]] : lista.flatMap((x, i) => permutaciones([...lista.slice(0, i), ...lista.slice(i + 1)]).map((resto) => [x, ...resto]));
    const todas = permutaciones(autores);
    expect(todas).toHaveLength(120);
    for (const permutada of todas) {
      expect(ordenDeAutoresPorNombre(permutada).map((a) => a.valor)).toEqual(esperado);
      expect(ordenDeTemasPorNombre(permutada).map((a) => a.valor)).toEqual(esperado);
    }
    expect(autores).toEqual(copia);
  });
});

describe('Historia 27.2 — el ejemplo del campo da resultados con el Corpus de verdad', () => {
  it('alguna Cita publicada contiene «no hay camino»', async () => {
    const conjunto = await conjuntoDelCorpus(rutasDelCorpus(join(RAIZ, 'corpus')));
    const buscado = normalizar(EJEMPLO_DE_LA_BUSQUEDA);
    const con = conjunto.citas.filter((cita) => normalizar(cita.texto).includes(buscado));
    expect(con.length, 'ninguna Cita publicada dice el ejemplo del campo').toBeGreaterThan(0);
  }, 120_000);
});

/*
 * Lo construido. Un Corpus con tres Autores cuyo orden por nombre no es el del Directorio (Amado
 * Nervo, «Nervo», va antes que José Martí, «Martí», al leerse), un Autor sin Citas, dos Temas
 * publicados y uno bajo su umbral, construido con la medición y con Pagefind.
 *
 * Historia 27.3 — con Obras: Séneca con dos («Cartas», seis Citas, y la «Brevedad», tres); José
 * Martí con dos, «Versos sencillos» (seis) y «Cartas» de una sola Cita, que no se indexa (FR-52) y
 * es homónima de la de Séneca —de otra Fuente, para que no compartan documento—; Amado Nervo con una.
 * El Autor sin ninguna Obra no cabe en este andamio: sus Citas irían sin documento, y el censo de
 * cotejo es cerrado. Lo cubren `filtros-de-busqueda.test.ts`, el entorno simulado de
 * `medicion.test.ts` y `tests/e2e/busqueda.spec.ts`.
 */
const ENDPOINT = 'https://medicion.ejemplo.workers.dev/e';
const AUTORES: Record<string, { nombre: string; orden: string; obra: string; citas: number }> = {
  seneca: { nombre: 'Séneca', orden: 'Séneca', obra: 'Sobre la brevedad de la vida', citas: 9 },
  'jose-marti': { nombre: 'José Martí', orden: 'Martí', obra: 'Versos sencillos', citas: 7 },
  'amado-nervo': { nombre: 'Amado Nervo', orden: 'Nervo', obra: 'La amada inmóvil', citas: 4 },
};
const yamlDeAutor = (nombre: string, orden: string) =>
  `nombre: ${nombre}\nañoNacimiento: 1850\nañoFallecimiento: 1900\nsemblanza: Escritor del catálogo de prueba.\nordenAlfabetico: ${orden}\n`;

interface CitaDelFixture {
  slug: string;
  autor: string;
  temas: string[];
}
const CITAS: CitaDelFixture[] = Object.entries(AUTORES).flatMap(([autor, { citas }], a) =>
  Array.from({ length: citas }, (_, i) => ({
    slug: `${autor}-frase-${String(i).padStart(2, '0')}`,
    autor,
    // Todas en «El tiempo»; «La vida» en todas salvo la primera de cada Autor; «La ira», en una.
    temas: ['el-tiempo', ...(i >= 1 ? ['la-vida'] : []), ...(a === 0 && i === 0 ? ['la-ira'] : [])],
  })),
);
const textoDe = (cita: CitaDelFixture) => `Frase ${cita.slug.slice(-2)} de ${AUTORES[cita.autor].nombre}: escuela del catálogo.`;
/** Historia 27.3 — la Obra de cada Cita: las seis primeras de Séneca, «Cartas»; la última de Martí, también. */
const obraDe = (cita: CitaDelFixture): string => {
  const i = Number(cita.slug.slice(-2));
  if (cita.autor === 'seneca' && i < 6) return 'Cartas';
  if (cita.autor === 'jose-marti' && i === 6) return 'Cartas';
  return AUTORES[cita.autor].obra;
};
/** La de Martí sale de otra Fuente: dos «Cartas» de la misma serían un solo documento. */
const fuenteDe = (cita: CitaDelFixture) =>
  cita.autor === 'jose-marti' && obraDe(cita) === 'Cartas'
    ? { id: 'gutenberg', url: 'https://www.gutenberg.org/ebooks/27300' }
    : { id: 'wikisource-es', url: `https://es.wikisource.org/wiki/${encodeURIComponent(obraDe(cita))}` };
/** El mapa que tiene que salir: por slug de Autor, sus Obras de más a menos Citas. */
const MAPA_ESPERADO = {
  'amado-nervo': [['amado-nervo--la-amada-inmovil', 'La amada inmóvil']],
  'jose-marti': [
    ['jose-marti--versos-sencillos', 'Versos sencillos'],
    ['jose-marti--cartas', 'Cartas'],
  ],
  seneca: [
    ['seneca--cartas', 'Cartas'],
    ['seneca--sobre-la-brevedad-de-la-vida', 'Sobre la brevedad de la vida'],
  ],
};

const CORPUS: Record<string, string> = {
  'autores/seneca.yml': AUTOR_VALIDO,
  'autores/jose-marti.yml': yamlDeAutor('José Martí', 'Martí'),
  'autores/amado-nervo.yml': yamlDeAutor('Amado Nervo', 'Nervo'),
  // Un Autor sin Citas publicadas: no es opción.
  'autores/fray-luis-de-leon.yml': yamlDeAutor('Fray Luis de León', 'León'),
  'temas/el-tiempo.yml': TEMA_VALIDO,
  'temas/la-vida.yml': 'nombre: La vida\n',
  'temas/la-ira.yml': 'nombre: La ira\n',
  ...Object.fromEntries(
    CITAS.map((cita) => [
      `citas/${cita.slug}.md`,
      citaValida({
        slug: cita.slug,
        autor: cita.autor,
        texto: textoDe(cita),
        temas: cita.temas,
        procedencia: { obra: obraDe(cita), año: 1890 },
        fuente: fuenteDe(cita),
      }),
    ]),
  ),
};

/** Las rutas de Cita que enlaza el listado de un Autor, todas sus páginas. */
function citasDelListado(dist: string, autor: string): Set<string> {
  const raiz = join(dist, 'autor', autor);
  const paginas = [join(raiz, 'index.html')];
  for (const entrada of readdirSync(raiz)) {
    if (/^\d+$/u.test(entrada) && statSync(join(raiz, entrada)).isDirectory()) paginas.push(join(raiz, entrada, 'index.html'));
  }
  const rutas = new Set<string>();
  for (const pagina of paginas) {
    for (const [, href] of readFileSync(pagina, 'utf8').matchAll(/href="(\/cita\/[^"#?]+)"/gu)) rutas.add(decodificar(href));
  }
  return rutas;
}

/** La ruta de Cita de una URL de resultado, con su barra final. */
const rutaDe = (url: string) => url.replace(/(?:index)?\.html$/u, '').replace(/\/?$/u, '/');

describe('Historia 27.2 — lo construido', () => {
  let proyecto = '';
  let html = '';
  let indice: (IndiceDePagefind & { soltar(): void }) | undefined;

  beforeAll(async () => {
    const resultado = await construirConCorpus(CORPUS, { conBusqueda: true, entorno: { MEDICION_ENDPOINT: ENDPOINT } });
    proyecto = resultado.proyecto;
    expect(resultado.codigo, resultado.salida).toBe(0);
    html = readFileSync(paginaConstruida(proyecto, '/buscar/'), 'utf8');
    indice = await indiceDe(proyecto);
  }, 300_000);

  afterAll(async () => {
    indice?.soltar();
    if (proyecto) await limpiar(proyecto);
  });

  it('`/buscar/` no lleva guion propio en línea: solo el arranque de la medición', () => {
    expect(guionesEnLinea(html)).toEqual([ARRANQUE_DE_MEDICION]);
    expect(html).not.toContain('define:vars');
    expect(html).not.toMatch(/<script\b[^>]*type="module"[^>]*>[^<]/u);
  });

  it('NFR-7 — `/buscar/` no pide ninguna hoja de estilo: la suya va en línea, como la del Armazón', () => {
    // Fuera, la hoja de la búsqueda bloqueaba la primera pintura (+360 ms de FCP en la puerta de la 27.9).
    expect(html).not.toMatch(/<link\b[^>]*\brel="stylesheet"/u);
    const enLinea = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gu)].map(([, cuerpo]) => cuerpo).join('\n');
    expect(enLinea).toMatch(/\.quitar\b/u);
  });

  it('pide el fichero de la búsqueda con `<script type="module" src>`, detrás del de medición, y el fichero existe', () => {
    const guiones = guionesEjecutables(html);
    const deMedicion = guiones.findIndex((g) => g.atributos.includes(rutaDelGuionDeMedicion(ENDPOINT)));
    const deLaBusqueda = guiones.findIndex((g) => /\bsrc="\/_astro\/Busqueda\.astro_astro_type_script_index_0_lang\.[^"]+\.js"/u.test(g.atributos));
    expect(deMedicion).toBeGreaterThanOrEqual(0);
    expect(deLaBusqueda).toBeGreaterThan(deMedicion);
    expect(guiones[deLaBusqueda].atributos).toMatch(/\btype="module"/u);
    const etiqueta = etiquetasDeGuionExterno(html).find((e) => guionExternoDe(e.src)?.id === 'busqueda');
    expect(etiqueta).toBeDefined();
    expect(statSync(join(proyecto, 'dist', etiqueta!.src)).isFile()).toBe(true);
  });

  it('la plantilla lleva el campo, los dos selectores con sus opciones del build y «Quitar los filtros» oculto', () => {
    const plantilla = /<template\b[^>]*>([\s\S]*?)<\/template>/u.exec(html)?.[1];
    expect(plantilla, 'no hay plantilla').toBeDefined();
    const selectores = new Map<string, { valor: string; rotulo: string }[]>();
    const campos: ReadonlyMap<string, string>[] = [];
    const botones: ReadonlyMap<string, string>[] = [];
    recorrerElementos(`<div>${plantilla}</div>`, (elemento) => {
      if (elemento.etiqueta === 'input') campos.push(elemento.atributos);
      if (elemento.etiqueta === 'button') botones.push(elemento.atributos);
    });
    for (const [, id, cuerpo] of plantilla!.matchAll(/<select\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/select>/gu)) {
      selectores.set(
        id,
        [...cuerpo.matchAll(/<option\b[^>]*\bvalue="([^"]*)"[^>]*>([^<]*)<\/option>/gu)].map((m) => ({
          valor: decodificar(m[1]),
          rotulo: decodificar(m[2]),
        })),
      );
    }
    const leyenda = /<legend\b[^>]*class="solo-para-lectores"[^>]*>([^<]*)<\/legend>/u.exec(plantilla!)?.[1] ?? '';

    // Historia 27.3 — y el de Obra, entre los dos, solo con «Todas sus obras»: sus opciones no van en el HTML.
    expect([...selectores.keys()]).toEqual(['filtro-de-autor', 'filtro-de-obra', 'filtro-de-tema']);
    expect(selectores.get('filtro-de-obra')).toEqual([{ valor: '', rotulo: 'Todas sus obras' }]);
    expect(plantilla).toMatch(/<label\b[^>]*for="filtro-de-obra"[^>]*>Obra<\/label>/u);
    expect(plantilla).toMatch(/<select\b[^>]*\bid="filtro-de-obra"[^>]*\bdata-selector-de-obra\b/u);
    // Solo los Autores con Citas publicadas, por el nombre como se lee; primero «Todos los autores».
    expect(selectores.get('filtro-de-autor')).toEqual([
      { valor: '', rotulo: 'Todos los autores' },
      { valor: 'amado-nervo', rotulo: 'Amado Nervo' },
      { valor: 'jose-marti', rotulo: 'José Martí' },
      { valor: 'seneca', rotulo: 'Séneca' },
    ]);
    // Solo los Temas publicados —«La ira», con una Cita, no—, con su artículo; primero «Todos los temas».
    expect(MIN_CITAS_POR_TEMA).toBeGreaterThan(1);
    expect(selectores.get('filtro-de-tema')).toEqual([
      { valor: '', rotulo: 'Todos los temas' },
      { valor: 'el-tiempo', rotulo: 'El tiempo' },
      { valor: 'la-vida', rotulo: 'La vida' },
    ]);
    expect(leyenda).toBe('Filtrar las citas');
    expect(plantilla).toMatch(/<label\b[^>]*for="filtro-de-autor"[^>]*>Autor<\/label>/u);
    expect(plantilla).toMatch(/<label\b[^>]*for="filtro-de-tema"[^>]*>Tema<\/label>/u);
    expect(plantilla).toContain(`>${ETIQUETA_DE_LA_BUSQUEDA}</label>`);

    expect(campos).toHaveLength(1);
    expect(campos[0].get('name')).toBe('q');
    expect(campos[0].get('placeholder')).toBe(TEXTO_DE_EJEMPLO_DE_LA_BUSQUEDA);
    expect(campos[0].has('data-consulta')).toBe(true);
    // «Quitar los filtros», oculto, y (Historia 27.5) el de «Mostrar 30 más», vacío.
    expect(botones).toHaveLength(2);
    expect(botones[0].get('type')).toBe('button');
    expect(botones[0].has('hidden')).toBe(true);
    expect(botones[1].get('type')).toBe('button');
    expect(botones[1].has('data-mostrar-mas')).toBe(true);
    expect(plantilla).toMatch(/<button\b[^>]*>Quitar los filtros<\/button>/u);
    // La lista de resultados es una lista, con su zona; la región está desde la carga, vacía.
    expect(html).toMatch(/<ul class="resultados filas-de-resultado" role="list" data-resultados data-zona="resultado"/u);
    expect(html).toMatch(/<p class="estado" role="status" data-estado[^>]*><\/p>/u);
  });

  it('cada elemento que busca el fichero de la búsqueda está en lo construido, donde lo busca', () => {
    /*
     * Revisión de la 27.2 — el guion encuentra lo que usa por selectores y, si falta uno, no
     * arranca: `/buscar/` se queda en el `h1`. El entorno simulado de `medicion.test.ts` sirve sus
     * propios elementos, así que aquí se cruzan los selectores que lleva el fichero construido con
     * el HTML construido. Un selector nuevo en el guion pone esto en rojo hasta decir dónde va.
     */
    const etiqueta = etiquetasDeGuionExterno(html).find((e) => guionExternoDe(e.src)?.id === 'busqueda');
    expect(etiqueta).toBeDefined();
    const guion = readFileSync(join(proyecto, 'dist', etiqueta!.src), 'utf8');
    const buscados = new Set([...guion.matchAll(/\.querySelector(?:All)?\(\s*(["'`])([^"'`]+)\1\s*\)/gu)].map((m) => m[2]));
    // La del `nonce` la busca el envoltorio que el empaquetado pone a todo `import()`, no la isla.
    buscados.delete('meta[property=csp-nonce]');
    // Lo que busca en lo que clona de la plantilla, y lo que busca en la página.
    const EN_LA_PLANTILLA = [
      'form',
      '[data-consulta]',
      '[data-selector-de-autor]',
      '[data-selector-de-obra]',
      '[data-selector-de-tema]',
      '[data-quitar]',
      '.sombra',
      '[data-mas]',
      '[data-mostrar-mas]',
      '[data-fallo-de-la-tanda]',
    ];
    // Historia 27.7 — el aviso previo, en la raíz, y la plantilla del aviso del fallo, en la página.
    const EN_LA_PAGINA = [
      '[data-busqueda]',
      'template',
      '[data-resultados]',
      '[data-estado]',
      '[data-salida]',
      '.sugerencia',
      '[data-aviso-previo]',
      '[data-plantilla-del-fallo]',
    ];
    expect([...buscados].sort()).toEqual([...EN_LA_PLANTILLA, ...EN_LA_PAGINA].sort());

    const tieneClase = (elemento: { atributos: ReadonlyMap<string, string> }, clase: string) =>
      (elemento.atributos.get('class') ?? '').split(/\s+/u).includes(clase);
    const casa = (selector: string, elemento: { etiqueta: string; atributos: ReadonlyMap<string, string> }) =>
      selector.startsWith('[')
        ? elemento.atributos.has(selector.slice(1, -1))
        : selector.startsWith('.')
          ? tieneClase(elemento, selector.slice(1))
          : elemento.etiqueta === selector;
    type Visto = { plantilla: boolean; raiz: boolean; recuento: boolean; salida: boolean };
    const vistos = new Map<string, Visto[]>();
    recorrerElementos(html, (elemento, antepasados) => {
      for (const selector of buscados) {
        if (!casa(selector, elemento)) continue;
        vistos.set(selector, [
          ...(vistos.get(selector) ?? []),
          {
            plantilla: antepasados.some((a) => a.etiqueta === 'template'),
            raiz: antepasados.some((a) => a.atributos.has('data-busqueda')),
            recuento: antepasados.some((a) => tieneClase(a, 'recuento')),
            salida: antepasados.some((a) => a.atributos.has('data-salida')),
          },
        ]);
      }
    });
    // Cada uno de la plantilla, una vez dentro de ella, y ella dentro de la raíz.
    for (const selector of EN_LA_PLANTILLA) {
      expect(vistos.get(selector)?.filter((v) => v.plantilla), selector).toEqual([
        { plantilla: true, raiz: true, recuento: false, salida: false },
      ]);
    }
    expect(vistos.get('template')?.[0]).toEqual({ plantilla: false, raiz: true, recuento: false, salida: false });
    // Lo de la página, el primero que encuentra `document.querySelector`, fuera de la plantilla; la
    // región dentro de `.recuento`, la rejilla donde la sombra le reserva el alto.
    expect(vistos.get('[data-busqueda]')?.[0]).toEqual({ plantilla: false, raiz: false, recuento: false, salida: false });
    expect(vistos.get('[data-resultados]')?.[0]).toEqual({ plantilla: false, raiz: false, recuento: false, salida: false });
    expect(vistos.get('[data-estado]')?.[0]).toEqual({ plantilla: false, raiz: false, recuento: true, salida: false });
    expect(vistos.get('[data-salida]')?.[0]).toEqual({ plantilla: false, raiz: false, recuento: false, salida: false });
    // La sugerencia que se anuncia a cero, dentro de la salida.
    expect(vistos.get('.sugerencia')?.[0]).toEqual({ plantilla: false, raiz: false, recuento: false, salida: true });
    // Historia 27.7 — el aviso previo en la raíz, fuera de toda plantilla; la del fallo, fuera de la raíz.
    expect(vistos.get('[data-aviso-previo]')).toEqual([{ plantilla: false, raiz: true, recuento: false, salida: false }]);
    expect(vistos.get('[data-plantilla-del-fallo]')).toEqual([{ plantilla: false, raiz: false, recuento: false, salida: false }]);
  });

  it('Historia 27.3 — `dist/buscar/obras.json` es el mapa de `filtrosDeLaBusqueda`, y no va en el HTML', async () => {
    const mapa = JSON.parse(readFileSync(join(proyecto, 'dist', MAPA_DE_OBRAS_EN_DIST), 'utf8')) as unknown;
    expect(mapa).toEqual(MAPA_ESPERADO);
    const conjunto = await conjuntoDelCorpus(rutasDelCorpus(join(proyecto, 'corpus')));
    expect(mapa).toEqual(filtrosDeLaBusqueda(conjunto).mapaDeObras);
    expect(Object.keys(mapa as object)).toEqual(Object.keys(MAPA_ESPERADO).sort());
    // Ni el mapa ni las opciones de Obra en el HTML de `/buscar/`, ni la dirección del mapa.
    for (const [nombre, titulo] of Object.values(MAPA_ESPERADO).flat()) {
      expect(html, nombre).not.toContain(nombre);
      expect(html, titulo).not.toContain(titulo);
    }
    expect(html).not.toContain(RUTA_DEL_MAPA_DE_OBRAS);
  }, 120_000);

  it('Historia 27.4 — ninguna combinación de parámetros crea ruta ni página indexable: un solo HTML de `/buscar/`, fuera del sitemap, `noindex` y con canónica `/buscar/`', () => {
    const dist = join(proyecto, 'dist');
    const deBuscar = readdirSync(join(dist, 'buscar'), { recursive: true }).map(String).sort();
    expect(deBuscar).toEqual(['index.html', 'obras.json']);
    expect(MAPA_DE_OBRAS_EN_DIST).toBe('buscar/obras.json');
    const sitemaps = readdirSync(dist).filter((f) => /^sitemap.*\.xml$/u.test(f));
    expect(sitemaps.length).toBeGreaterThan(0);
    for (const sitemap of sitemaps) expect(readFileSync(join(dist, sitemap), 'utf8'), sitemap).not.toMatch(/\/buscar\b/u);
    expect(html).toMatch(/<meta name="robots" content="noindex[^"]*"/u);
    const canonica = /<link rel="canonical" href="([^"]+)"/u.exec(html)?.[1];
    expect(canonica && new URL(canonica).pathname).toBe('/buscar/');
    expect(canonica).not.toContain('?');
    // El formulario sin guion envía a la misma ruta: su `action` es la que la isla compone.
    expect(html).toMatch(new RegExp(`<form\\b[^>]*\\baction="${rutaDeLaBusqueda()}"`, 'u'));
    // Y fuera del índice de Pagefind: ninguna parte de la página es cuerpo indexable.
    expect(html).not.toContain('data-pagefind-body');
  });

  it('Historia 27.4 — los tres selectores llevan `autocomplete="off"`, como el campo: si no, al volver sin la caché el navegador restaura su valor después de la llegada', () => {
    for (const id of ['filtro-de-autor', 'filtro-de-obra', 'filtro-de-tema']) {
      const select = new RegExp(`<select\\b[^>]*\\bid="${id}"[^>]*>`, 'u').exec(html)?.[0];
      expect(select, id).toBeDefined();
      expect(select, id).toMatch(/\bautocomplete="off"/u);
    }
  });

  it('Historia 27.5 — en la plantilla, fuera del formulario, el bloque de «Mostrar 30 más»: el botón vacío y su región vacía, sin `hidden` ni enlaces', () => {
    const plantilla = /<template\b[^>]*>([\s\S]*?)<\/template>/u.exec(html)![1];
    const formulario = /<form\b[\s\S]*?<\/form>/u.exec(plantilla)![0];
    expect(formulario).not.toContain('data-mas');
    expect(formulario).not.toContain('data-mostrar-mas');
    expect(formulario).not.toContain('data-fallo-de-la-tanda');
    const bloque = /<div\b[^>]*\bclass="mas"[^>]*\bdata-mas\b[^>]*>([\s\S]*?)<\/div>/u.exec(plantilla);
    expect(bloque, 'no hay bloque').not.toBeNull();
    expect(plantilla.indexOf(bloque![0])).toBeGreaterThan(plantilla.indexOf('</form>'));
    const dentro = bloque![1];
    expect(dentro).toMatch(/^<button\b[^>]*\btype="button"[^>]*\bdata-mostrar-mas\b[^>]*><\/button><p\b[^>]*><\/p>$/u);
    const region = /<p\b([^>]*)><\/p>/u.exec(dentro)![1];
    expect(region).toMatch(/\bclass="fallo-de-la-tanda"/u);
    expect(region).toMatch(/\brole="status"/u);
    expect(region).toMatch(/\bdata-fallo-de-la-tanda\b/u);
    expect(region).not.toMatch(/\bhidden\b|aria-hidden/u);
    expect(dentro).not.toMatch(/<a\b/u);
    // Fuera de la plantilla, ni el bloque ni su región: el guion los pone detrás de la lista.
    const fuera = html.replace(/<template\b[^>]*>[\s\S]*?<\/template>/gu, '');
    expect(fuera).not.toContain('data-mas');
    expect(fuera).not.toContain('data-fallo-de-la-tanda');
  });

  it('Historia 27.5 — el guion de `Busqueda.astro`, sin comentarios, no lleva un `30` literal: la tanda es `TANDA_DE_RESULTADOS`', () => {
    const componente = readFileSync(join(RAIZ, 'src/components/Busqueda.astro'), 'utf8');
    const guion = componente
      .slice(componente.indexOf('\n<script>'))
      .replace(/\/\*[\s\S]*?\*\//gu, '')
      .replace(/^\s*\/\/.*$/gmu, '');
    expect(guion).toContain('TANDA_DE_RESULTADOS');
    expect(guion).not.toMatch(/(?<![\w.])30(?![\w.])/u);
    expect(guion).toMatch(/\.slice\(0, TANDA_DE_RESULTADOS\)/u);
  });

  it('Historia 27.6 — la salida sin resultados ofrece los destacados en el orden del Directorio, sin `target`, y la frase sin filtros', () => {
    const enlaces: { href: string; target: string | undefined }[] = [];
    recorrerElementos(html, (elemento, antepasados) => {
      if (elemento.etiqueta !== 'a' || !antepasados.some((a) => a.atributos.has('data-salida'))) return;
      const href = elemento.atributos.get('href') ?? '';
      if (href.startsWith('/autor/')) enlaces.push({ href, target: elemento.atributos.get('target') });
    });
    // Martí, Nervo, Séneca: el orden del Directorio («Martí», «Nervo», «Séneca»), no el de los
    // nombres (Amado, José, Séneca) ni el de las Citas (9, 7, 4). Fray Luis, sin Citas, nunca.
    expect(enlaces).toEqual([
      { href: '/autor/jose-marti/', target: undefined },
      { href: '/autor/amado-nervo/', target: undefined },
      { href: '/autor/seneca/', target: undefined },
    ]);
    const sugerencia = /<p\b[^>]*class="sugerencia[^"]*"[^>]*>([^<]*)<\/p>/u.exec(html);
    expect(sugerencia?.[1]).toBe(SUGERENCIA_SIN_FILTROS);
  });

  it('Historia 27.3 — en la plantilla, el `.selector` de Obra va entre el de Autor y el de Tema', () => {
    const plantilla = /<template\b[^>]*>([\s\S]*?)<\/template>/u.exec(html)![1];
    const posicion = (id: string) => plantilla.indexOf(`id="${id}"`);
    expect(posicion('filtro-de-autor')).toBeGreaterThan(0);
    expect(posicion('filtro-de-obra')).toBeGreaterThan(posicion('filtro-de-autor'));
    expect(posicion('filtro-de-tema')).toBeGreaterThan(posicion('filtro-de-obra'));
    // Cada uno en su `.selector`: tres cajas, la de Obra con su etiqueta y su select dentro.
    const cajas = [...plantilla.matchAll(/<div\b[^>]*class="selector[^"]*"[^>]*>([\s\S]*?)<\/div>/gu)].map((m) => m[1]);
    expect(cajas).toHaveLength(3);
    expect(cajas[1]).toMatch(/for="filtro-de-obra"/u);
    expect(cajas[1]).toMatch(/id="filtro-de-obra"/u);
  });

  it('Historia 27.7 — `/buscar/` lleva el aviso tres veces, del mismo componente: en `<noscript>`, el previo y el de la plantilla del fallo, con sus frases y los dos Directorios, fuera de la Zona `resultado`', () => {
    interface Aviso {
      donde: 'noscript' | 'previo' | 'fallo';
      sinZona: string | undefined;
      enResultado: boolean;
      parrafos: string[];
      filas: { li: string; aria: string | undefined; href: string | undefined; target: string | undefined; clase: string; titulo: string; tituloClase: string }[];
      listaRole: string | undefined;
      listaClase: string;
    }
    const avisos: Aviso[] = [];
    const tieneClase = (atributos: ReadonlyMap<string, string>, clase: string) => (atributos.get('class') ?? '').split(/\s+/u).includes(clase);
    // La raíz de cada aviso, con sus antepasados: dónde está.
    const raices: { antepasados: readonly { etiqueta: string; atributos: ReadonlyMap<string, string> }[]; atributos: ReadonlyMap<string, string> }[] = [];
    recorrerElementos(html, (elemento, antepasados) => {
      if (elemento.etiqueta === 'div' && tieneClase(elemento.atributos, 'aviso-de-la-busqueda')) {
        raices.push({ antepasados: [...antepasados], atributos: elemento.atributos });
      }
    });
    expect(raices).toHaveLength(3);
    // El marcado de cada uno, en orden de aparición.
    const marcados = [...html.matchAll(/<div\b[^>]*\bclass="aviso-de-la-busqueda\b[^"]*"[^>]*>([\s\S]*?)<\/ul>\s*<\/div>/gu)].map((m) => m[0]);
    expect(marcados).toHaveLength(3);
    const texto = (fragmento: string) => decodificar(fragmento.replace(/<[^>]+>/gu, '')).trim();
    raices.forEach((raiz, i) => {
      const marcado = marcados[i];
      const donde = raiz.antepasados.some((a) => a.etiqueta === 'noscript')
        ? 'noscript'
        : raiz.antepasados.some((a) => a.etiqueta === 'template')
          ? 'fallo'
          : 'previo';
      const filas: Aviso['filas'] = [];
      let listaRole: string | undefined;
      let listaClase = '';
      recorrerElementos(marcado, (elemento, antepasados) => {
        if (elemento.etiqueta === 'ul') {
          listaRole = elemento.atributos.get('role');
          listaClase = elemento.atributos.get('class') ?? '';
        }
        if (elemento.etiqueta === 'a') {
          const li = antepasados.at(-1);
          filas.push({
            li: li?.etiqueta === 'li' && tieneClase(li.atributos, 'resultado') ? 'li.resultado' : String(li?.etiqueta),
            aria: elemento.atributos.get('aria-label'),
            href: elemento.atributos.get('href'),
            target: elemento.atributos.get('target'),
            clase: '',
            titulo: '',
            tituloClase: '',
          });
        }
      });
      const spans = [...marcado.matchAll(/<span\b([^>]*)>([^<]*)<\/span>/gu)];
      spans.forEach(([, atributos, contenido], k) => {
        const fila = filas[Math.floor(k / 2)];
        if (k % 2 === 0) fila.clase = /\bclass="clase\b/u.test(atributos) && /\bdata-tipo="directorio"/u.test(atributos) ? decodificar(contenido) : '¿?';
        else {
          fila.titulo = decodificar(contenido);
          fila.tituloClase = /\bclass="([^"]*)"/u.exec(atributos)?.[1] ?? '';
        }
      });
      avisos.push({
        donde,
        sinZona: raiz.atributos.get('data-sin-zona'),
        enResultado: raiz.antepasados.some((a) => a.atributos.get('data-zona') === 'resultado'),
        parrafos: [...marcado.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gu)].map((m) => texto(m[1])),
        filas,
        listaRole,
        listaClase,
      });
      // El previo, y solo él, lleva su marca; el de la plantilla, la suya.
      expect(raiz.atributos.has('data-aviso-previo'), donde).toBe(donde === 'previo');
      if (donde === 'fallo') {
        expect(raiz.antepasados.some((a) => a.etiqueta === 'template' && a.atributos.has('data-plantilla-del-fallo'))).toBe(true);
      }
      // El de `<noscript>` y el previo, en la raíz de la búsqueda; el del fallo, fuera.
      expect(raiz.antepasados.some((a) => a.atributos.has('data-busqueda')), donde).toBe(donde !== 'fallo');
    });

    expect(avisos.map((a) => a.donde)).toEqual(['noscript', 'previo', 'fallo']);
    const FRASES = { noscript: AVISO_SIN_GUION, previo: AVISO_PREVIO, fallo: AVISO_DEL_FALLO };
    for (const aviso of avisos) {
      expect(aviso.sinZona, aviso.donde).toBe('directorios-del-aviso');
      expect(EXENCIONES_DE_ZONA).toContain(aviso.sinZona);
      expect(aviso.enResultado, aviso.donde).toBe(false);
      expect(aviso.parrafos, aviso.donde).toEqual([FRASES[aviso.donde].lema, FRASES[aviso.donde].sigue]);
      expect(aviso.listaRole, aviso.donde).toBe('list');
      expect(aviso.listaClase.split(/\s+/u), aviso.donde).toContain('filas-de-resultado');
      expect(aviso.filas, aviso.donde).toEqual(
        [
          [NOMBRE_DEL_DIRECTORIO_DE_AUTORES, rutaDelDirectorioDeAutores()],
          [NOMBRE_DEL_DIRECTORIO_DE_OBRAS, rutaDelDirectorioDeObras()],
        ].map(([titulo, href]) => ({
          li: 'li.resultado',
          aria: `${ETIQUETAS_DE_RESULTADO.directorio}: ${titulo}`,
          href,
          target: undefined,
          clase: ETIQUETAS_DE_RESULTADO.directorio,
          titulo,
          tituloClase: expect.stringMatching(/^titulo en-sans\b/u),
        })),
      );
    }
    // La frase de volver atrás es una sola cadena, en los tres.
    for (const aviso of [AVISO_SIN_GUION, AVISO_PREVIO, AVISO_DEL_FALLO]) expect(aviso.sigue.endsWith(VOLVER_ATRAS_A_LAS_CITAS)).toBe(true);
    expect(ANUNCIO_DEL_FALLO_DE_LA_BUSQUEDA).toBe(`${AVISO_DEL_FALLO.lema} ${AVISO_DEL_FALLO.sigue}`);
  });

  it('Historia 27.7 — ninguna otra página lleva el aviso de la búsqueda', () => {
    const dist = join(proyecto, 'dist');
    const conAviso: string[] = [];
    for (const fichero of readdirSync(dist, { recursive: true }).map(String)) {
      if (!fichero.endsWith('.html')) continue;
      if (readFileSync(join(dist, fichero), 'utf8').includes('aviso-de-la-busqueda')) conAviso.push(fichero);
    }
    expect(conAviso).toEqual(['buscar/index.html']);
  });

  describe('en el índice generado por Pagefind', () => {
    const datos = async (respuesta: Awaited<ReturnType<IndiceDePagefind['search']>>) =>
      Promise.all(respuesta.results.map((r) => r.data()));
    const ordenDe = (slug: string) => {
      const pagina = readFileSync(paginaConstruida(proyecto, `/cita/${slug}/`), 'utf8');
      return new RegExp(`data-pagefind-sort="${ORDEN_DE_CITA}:(\\d+)"`, 'u').exec(pagina)![1];
    };

    it('sin texto, con un Autor: todas sus Citas, en el orden de la clave, y cada una en el listado de su Autor (NFR-2)', async () => {
      for (const autor of Object.keys(AUTORES)) {
        const encontradas = await datos(
          await indice!.search(null, { filters: { [FILTROS_DE_CITA.autor]: autor }, sort: { [ORDEN_DE_CITA]: 'asc' } }),
        );
        const esperadas = CITAS.filter((c) => c.autor === autor)
          .map((c) => c.slug)
          .sort((a, b) => ordenDe(a).localeCompare(ordenDe(b)));
        expect(encontradas.map((d) => rutaDe(d.url)), autor).toEqual(esperadas.map((slug) => `/cita/${slug}/`));
        expect(encontradas.every((d) => d.filters[FILTRO_DE_TIPO]?.[0] === 'cita'), autor).toBe(true);
        const listado = citasDelListado(join(proyecto, 'dist'), autor);
        for (const d of encontradas) expect(listado, `${autor}: ${d.url}`).toContain(rutaDe(d.url));
      }
    });

    it('Autor y Tema: su cruce', async () => {
      const encontradas = await datos(
        await indice!.search(null, {
          filters: { [FILTROS_DE_CITA.autor]: 'jose-marti', [FILTROS_DE_CITA.tema]: 'la-vida' },
          sort: { [ORDEN_DE_CITA]: 'asc' },
        }),
      );
      const esperadas = CITAS.filter((c) => c.autor === 'jose-marti' && c.temas.includes('la-vida')).map((c) => `/cita/${c.slug}/`);
      expect(encontradas.map((d) => rutaDe(d.url)).sort()).toEqual(esperadas.sort());
      expect(encontradas).toHaveLength(AUTORES['jose-marti'].citas - 1);
    });

    it('con texto y un filtro, solo Citas de lo filtrado —ni la del Autor ni la del Tema, que no declaran filtros—', async () => {
      // «escuela» está en el texto de toda Cita; «José Martí», además, en la Página de Autor.
      const sinFiltro = await datos(await indice!.search('José Martí'));
      expect(sinFiltro.some((d) => d.filters[FILTRO_DE_TIPO]?.[0] === 'autor'), 'sin filtro sale también el Autor').toBe(true);
      const conFiltro = await datos(await indice!.search('José Martí', { filters: { [FILTROS_DE_CITA.tema]: 'el-tiempo' } }));
      expect(conFiltro.length).toBeGreaterThan(0);
      expect(conFiltro.every((d) => d.filters[FILTRO_DE_TIPO]?.[0] === 'cita')).toBe(true);
      const conTema = await datos(await indice!.search('escuela', { filters: { [FILTROS_DE_CITA.tema]: 'la-vida' } }));
      expect(conTema.map((d) => rutaDe(d.url)).sort()).toEqual(
        CITAS.filter((c) => c.temas.includes('la-vida'))
          .map((c) => `/cita/${c.slug}/`)
          .sort(),
      );
    });

    it('Historia 27.3 — `filters().obra` cuenta lo mismo que `filtrosDeLaBusqueda` y nombra lo mismo que el mapa', async () => {
      const filtros = await indice!.filters();
      const conjunto = await conjuntoDelCorpus(rutasDelCorpus(join(proyecto, 'corpus')));
      const { obras, mapaDeObras } = filtrosDeLaBusqueda(conjunto);
      expect(filtros[FILTROS_DE_CITA.obra]).toEqual(Object.fromEntries(obras.map((o) => [o.valor, o.recuento])));
      expect(Object.keys(filtros[FILTROS_DE_CITA.obra]).sort()).toEqual(
        Object.values(mapaDeObras)
          .flat()
          .map(([nombre]) => nombre)
          .sort(),
      );
      expect(filtros[FILTROS_DE_CITA.obra]).toMatchObject({ 'seneca--cartas': 6, 'jose-marti--cartas': 1 });
    });

    it('Historia 27.3 — `search(null)` con Autor y Obra da las Citas de la Obra en el orden de su Página de Obra', async () => {
      for (const [autor, obra, ruta] of [
        ['seneca', 'seneca--cartas', '/obra/seneca/cartas/'],
        ['seneca', 'seneca--sobre-la-brevedad-de-la-vida', '/obra/seneca/sobre-la-brevedad-de-la-vida/'],
        ['jose-marti', 'jose-marti--versos-sencillos', '/obra/jose-marti/versos-sencillos/'],
      ] as const) {
        const encontradas = await datos(
          await indice!.search(null, {
            filters: { [FILTROS_DE_CITA.autor]: autor, [FILTROS_DE_CITA.obra]: obra },
            sort: { [ORDEN_DE_CITA]: 'asc' },
          }),
        );
        const pagina = readFileSync(paginaConstruida(proyecto, ruta), 'utf8');
        const deLaPagina = [...new Set([...pagina.matchAll(/href="(\/cita\/[^"#?]+)"/gu)].map((m) => decodificar(m[1])))];
        expect(deLaPagina.length, ruta).toBeGreaterThan(0);
        expect(encontradas.map((d) => rutaDe(d.url)), obra).toEqual(deLaPagina);
        expect(encontradas.every((d) => d.filters[FILTRO_DE_TIPO]?.[0] === 'cita'), obra).toBe(true);
      }
    });

    it('Historia 27.3 — la Obra de una sola Cita, `noindex`, filtra; pero nunca sale como resultado de tipo Obra', async () => {
      const pagina = readFileSync(paginaConstruida(proyecto, '/obra/jose-marti/cartas/'), 'utf8');
      expect(pagina).toMatch(/<meta name="robots" content="noindex/u);
      const filtrada = await datos(
        await indice!.search(null, {
          filters: { [FILTROS_DE_CITA.autor]: 'jose-marti', [FILTROS_DE_CITA.obra]: 'jose-marti--cartas' },
          sort: { [ORDEN_DE_CITA]: 'asc' },
        }),
      );
      expect(filtrada.map((d) => rutaDe(d.url))).toEqual(['/cita/jose-marti-frase-06/']);
      // Por su título, sale la «Cartas» indexable de Séneca, y la de Martí no.
      const deObra = (await datos(await indice!.search('Cartas'))).filter((d) => d.filters[FILTRO_DE_TIPO]?.[0] === 'obra');
      expect(deObra.map((d) => rutaDe(d.url))).toEqual(['/obra/seneca/cartas/']);
    });

    it('Historia 27.7 — los Directorios del aviso salen en Pagefind con el mismo rótulo y el mismo título', async () => {
      for (const [ruta, titulo] of [
        [rutaDelDirectorioDeAutores(), NOMBRE_DEL_DIRECTORIO_DE_AUTORES],
        [rutaDelDirectorioDeObras(), NOMBRE_DEL_DIRECTORIO_DE_OBRAS],
      ] as const) {
        const dato = (await datos(await indice!.search(titulo))).find((d) => rutaDe(d.url) === ruta);
        expect(dato, ruta).toBeDefined();
        expect(dato!.meta.title, ruta).toBe(titulo);
        expect(dato!.filters[FILTRO_DE_TIPO]?.[0], ruta).toBe('directorio');
      }
    });

    it('un Tema bajo su umbral no filtra nada: no es filtro', async () => {
      const filtros = await indice!.filters();
      expect(Object.keys(filtros[FILTROS_DE_CITA.tema] ?? {}).sort()).toEqual(['el-tiempo', 'la-vida']);
      expect(Object.keys(filtros[FILTROS_DE_CITA.autor] ?? {}).sort()).toEqual(Object.keys(AUTORES).sort());
    });
  });
});
