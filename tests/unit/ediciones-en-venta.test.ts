import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import {
  AUTOR_VALIDO,
  RAIZ,
  TEMA_VALIDO,
  TIENDA_DE_PRUEBA,
  TIENDA_SIN_MARCA_DE_PRUEBA,
  citaValida,
  construirConCorpus,
  fuenteConModeloEncendido,
  fuenteConTiendaDePrueba,
  limpiar,
  paginaConstruida,
} from './ayuda/construir.js';
import {
  MODELOS,
  TIENDAS,
  edicionesEnVenta,
  modeloDe,
  modelosEnRuta,
  modelosMarcadosEn,
  revisarDeclaracionDeIngreso,
  esMarcaValida,
  revisarTiendas,
  tieneMarca,
  urlDeEdicion,
  type Modelo,
  type Tienda,
  type TiendaConMarca,
} from '../../src/lib/ingreso.ts';
import { esquemaDeObra, obraAdmisible } from '../../src/lib/admision.ts';
import { avisosDeEdicionesSinCotejada, resolverObras, type FichaDeObra } from '../../src/lib/obras.ts';
import { MAX_CARACTERES_NOTA_DE_OBRA } from '../../src/lib/umbrales.ts';
import { componerDocumento } from '../../tools/lib/documento.ts';
import { enlacesDe } from './ayuda/enlaces.js';
import { tarjetaDeObraDe, textosDelEnlace } from './ayuda/tarjeta-de-obra.js';
import { escribirCita, rutasDelCorpus } from '../../tools/lib/corpus.ts';
import { declararEdicion, quitarEdicion, reunirFichas } from '../../tools/lib/obras.ts';
import { datosDelInforme, lineasDelInforme, estadosDe, textoDeTiendas } from '../../tools/lib/ingresos.ts';

const ejecutar = promisify(execFile);

/**
 * Historia 22.9 — las ediciones en venta, construidas y apagadas.
 *
 * El repositorio versiona `TIENDAS` vacío y la afiliación apagada: ninguna marca de afiliado se
 * escribe hasta que el dueño de la cuenta declare la primera tienda. Todo lo que necesita una
 * tienda la toma inventada —`TIENDA_DE_PRUEBA`, de dominio reservado—, en el proceso por
 * parámetro y en las construcciones parcheando la copia (AD-21).
 */

const TIENDA: TiendaConMarca = { ...TIENDA_DE_PRUEBA };
const DOMINIO = TIENDA.dominio;
/** Historia 33.1 — la tienda inventada sin marca, sin el campo. */
const SIN_MARCA: Tienda = { ...TIENDA_SIN_MARCA_DE_PRUEBA };
const DOMINIO_SIN_MARCA = SIN_MARCA.dominio;

const fichaBase = {
  autor: 'seneca',
  titulo: 'Sobre la brevedad de la vida',
  formas: ['sobre la brevedad de la vida'],
};
const edicion = (campos: Record<string, unknown> = {}) => ({
  tienda: TIENDA.clave,
  formato: 'impresa',
  url: `https://www.${DOMINIO}/dp/X`,
  ...campos,
});
const mensajes = (resultado: { success: boolean; error?: { issues: { message: string }[] } }) =>
  (resultado.error?.issues ?? []).map((i) => i.message).join('\n');

describe('Historia 22.9 — el repositorio, al cerrar', () => {
  it('TIENDAS está vacío y la afiliación apagada, admitida solo en la Página de Obra', () => {
    expect(TIENDAS).toEqual([]);
    const afiliacion = modeloDe('afiliacion-de-libros');
    expect(afiliacion?.encendido).toBe(false);
    expect(afiliacion?.dispara).toBe('solicita');
    expect(afiliacion?.admitidoEn).toEqual(['obra/[autor]/[slug]/[...page].astro']);
  });

  it('ninguna ficha del Corpus declara ediciones', async () => {
    const fichas = await readdir(resolve(RAIZ, 'corpus/obras'));
    for (const fichero of fichas.filter((f) => /\.ya?ml$/.test(f))) {
      const contenido = await readFile(resolve(RAIZ, 'corpus/obras', fichero), 'utf8');
      expect(contenido, fichero).not.toMatch(/^ediciones:/m);
    }
  });

  it('con el conjunto vacío, el esquema del sitio rechaza toda edición', () => {
    const r = obraAdmisible.safeParse({ ...fichaBase, ediciones: [edicion()] });
    expect(r.success).toBe(false);
    expect(mensajes(r)).toContain('hoy no declara ninguna');
  });
});

describe('Historia 22.9 — urlDeEdicion', () => {
  it('añade la marca respetando la consulta existente', () => {
    expect(
      urlDeEdicion({ url: `https://www.${DOMINIO}/dp/X?th=1` }, { ...TIENDA, marca: 'm-21' }),
    ).toBe(`https://www.${DOMINIO}/dp/X?th=1&tag=m-21`);
  });

  it('sin consulta, la abre; con fragmento, la marca va antes de él', () => {
    expect(urlDeEdicion({ url: `https://${DOMINIO}/x` }, TIENDA)).toBe(
      `https://${DOMINIO}/x?tag=marca-de-prueba-21`,
    );
    expect(urlDeEdicion({ url: `https://${DOMINIO}/x?a=%20b#c` }, TIENDA)).toBe(
      `https://${DOMINIO}/x?a=%20b&tag=marca-de-prueba-21#c`,
    );
    expect(urlDeEdicion({ url: `https://${DOMINIO}/x?` }, TIENDA)).toBe(
      `https://${DOMINIO}/x?tag=marca-de-prueba-21`,
    );
  });

  it('edicionesEnVenta compone en el orden de la ficha, y rompe con una tienda ajena', () => {
    const compuestas = edicionesEnVenta(
      [edicion(), edicion({ formato: 'electronica', descripcion: 'Cátedra, 2015' })],
      'seneca--x',
      [TIENDA],
    );
    expect(compuestas).toEqual([
      { href: `https://www.${DOMINIO}/dp/X?tag=marca-de-prueba-21`, formato: 'impresa', tienda: TIENDA.nombre },
      {
        href: `https://www.${DOMINIO}/dp/X?tag=marca-de-prueba-21`,
        formato: 'electronica',
        tienda: TIENDA.nombre,
        descripcion: 'Cátedra, 2015',
      },
    ]);
    expect(() => edicionesEnVenta([edicion({ tienda: 'otra' })], 'seneca--x', [TIENDA])).toThrow('no está declarada');
  });
});

describe('Historia 22.9 — el esquema de las ediciones', () => {
  const esquema = esquemaDeObra([TIENDA]);
  const juzgar = (ediciones: unknown) => esquema.safeParse({ ...fichaBase, ediciones });

  it('admite una edición de la tienda, también de un subdominio, con o sin descripción', () => {
    expect(juzgar([edicion()]).success).toBe(true);
    expect(juzgar([edicion({ url: `https://${DOMINIO}/dp/X` })]).success).toBe(true);
    expect(juzgar([edicion({ formato: 'electronica', descripcion: 'Cátedra, 2015' })]).success).toBe(true);
  });

  it('rechaza una URL de otro dominio', () => {
    const r = juzgar([edicion({ url: 'https://ejemplo.org/x' })]);
    expect(r.success).toBe(false);
    expect(mensajes(r)).toContain(`no es de ${DOMINIO}`);
    // Ni un dominio que solo lo contiene como prefijo.
    expect(juzgar([edicion({ url: `https://${DOMINIO}.ejemplo.org/x` })]).success).toBe(false);
  });

  it('rechaza la URL que ya trae la marca, se escriba el parámetro como se escriba', () => {
    for (const marca of ['tag', 'TAG', 'Tag']) {
      const r = juzgar([edicion({ url: `https://www.${DOMINIO}/dp/X?th=1&${marca}=otro-21` })]);
      expect(r.success, marca).toBe(false);
      expect(mensajes(r), marca).toContain('parámetro «tag»');
    }
    // Un parámetro que solo lo contiene no es la marca.
    expect(juzgar([edicion({ url: `https://www.${DOMINIO}/dp/X?tagline=1` })]).success).toBe(true);
  });

  it('rechaza un puerto explícito, también el de omisión', () => {
    for (const puerto of ['8443', '443']) {
      const r = juzgar([edicion({ url: `https://www.${DOMINIO}:${puerto}/dp/X` })]);
      expect(r.success, puerto).toBe(false);
      expect(mensajes(r), puerto).toContain('puerto');
    }
  });

  it('rechaza una tienda fuera del conjunto, una dirección en claro y un formato inventado', () => {
    expect(mensajes(juzgar([edicion({ tienda: 'libreria' })]))).toContain(`«${TIENDA.clave}»`);
    expect(mensajes(juzgar([edicion({ url: `http://www.${DOMINIO}/dp/X` })]))).toContain('https://');
    expect(juzgar([edicion({ formato: 'tapa-dura' })]).success).toBe(false);
    expect(juzgar([edicion({ url: 'no es una url' })]).success).toBe(false);
  });

  it('la descripción es de una línea, no vacía y hasta el tope de la nota', () => {
    expect(juzgar([edicion({ descripcion: 'una\nlínea' })]).success).toBe(false);
    expect(juzgar([edicion({ descripcion: '   ' })]).success).toBe(false);
    expect(juzgar([edicion({ descripcion: 'd'.repeat(MAX_CARACTERES_NOTA_DE_OBRA) })]).success).toBe(true);
    expect(juzgar([edicion({ descripcion: 'd'.repeat(MAX_CARACTERES_NOTA_DE_OBRA + 1) })]).success).toBe(false);
  });

  it('una lista vacía no se escribe, y una clave de más se nombra', () => {
    expect(juzgar([]).success).toBe(false);
    expect(mensajes(juzgar([edicion({ precio: 3 })]))).toContain('precio');
    expect(mensajes(esquema.safeParse({ ...fichaBase, otra: 1 }))).toContain('nota y ediciones');
  });
});

describe('Historia 22.9 — la admisión y el encendido', () => {
  const afiliacion = modeloDe('afiliacion-de-libros') as Modelo;
  const encendida: Modelo = { ...afiliacion, encendido: true };

  it('encender la afiliación exige alguna tienda, y no un destino', () => {
    const sin = revisarDeclaracionDeIngreso([encendida], undefined, []);
    expect(sin).toHaveLength(1);
    expect(sin[0]).toContain('no declara ninguna tienda');
    expect(revisarDeclaracionDeIngreso([encendida], undefined, [TIENDA])).toEqual([]);
    // Los demás Modelos siguen exigiendo destino.
    const donaciones = { ...(modeloDe('donaciones') as Modelo), encendido: true, destino: undefined };
    expect(revisarDeclaracionDeIngreso([donaciones], undefined, [TIENDA]).join()).toContain(
      'no lleva a ninguna parte',
    );
  });

  it('una tienda mal declarada se rechaza, encendida o apagada', () => {
    expect(revisarTiendas([TIENDA])).toEqual([]);
    expect(revisarTiendas([TIENDA, TIENDA]).join()).toContain('dos veces');
    expect(revisarTiendas([{ ...TIENDA, dominio: 'https://x.example' }]).join()).toContain('dominio');
    expect(revisarTiendas([{ ...TIENDA, marca: ' ' }]).join()).toContain('marca');
    expect(revisarDeclaracionDeIngreso([afiliacion], undefined, [{ ...TIENDA, nombre: '' }])).toHaveLength(1);
  });

  it('por forma: la página 1 de una Obra la aloja, la 2 no', () => {
    const declaracion = MODELOS.map((m) => (m.id === 'afiliacion-de-libros' ? encendida : m));
    expect(modelosEnRuta('/obra/a/b/', declaracion).map((m) => m.id)).toEqual(['afiliacion-de-libros']);
    expect(modelosEnRuta('/obra/a/b/2/', declaracion)).toEqual([]);
    // Y en ninguna otra superficie.
    for (const ruta of ['/', '/cita/seneca-x/', '/autor/seneca/', '/buscar/']) {
      expect(modelosEnRuta(ruta, declaracion).map((m) => m.id), ruta).not.toContain('afiliacion-de-libros');
    }
  });

  it('el informe como datos lleva las tiendas sin marca ni parámetro', () => {
    const medida = { medible: false, motivo: 'x' } as never;
    expect(datosDelInforme(medida, estadosDe(medida)).tiendas).toEqual([]);
    const datos = datosDelInforme(medida, estadosDe(medida), [TIENDA]);
    expect(datos.tiendas).toEqual([{ clave: TIENDA.clave, nombre: TIENDA.nombre, dominio: DOMINIO, conMarca: true }]);
    const texto = JSON.stringify(datos);
    expect(texto).not.toContain(TIENDA.marca);
    expect(texto).not.toContain('"parametro"');
    expect(datos.modelos.map((m) => m.id)).toContain('afiliacion-de-libros');
  });

  it('el informe dice «solicitar» y que no hay ninguna tienda', () => {
    const texto = lineasDelInforme(estadosDe({ medible: false, motivo: 'sin medir' } as never)).join('\n');
    expect(texto).toContain('dispara la SOLICITUD');
    expect(texto).toContain('ninguna tienda declarada');
    expect(lineasDelInforme(estadosDe({ medible: false, motivo: 'x' } as never), [TIENDA]).join('\n')).toContain(
      `1 declarada: ${TIENDA.nombre} (${DOMINIO})`,
    );
  });
});

describe('Historia 33.1 — una tienda sin marca', () => {
  const afiliacion = modeloDe('afiliacion-de-libros') as Modelo;
  const encendida: Modelo = { ...afiliacion, encendido: true };

  it('se declara sin el campo, con la afiliación apagada', () => {
    expect(Object.hasOwn(SIN_MARCA, 'marca')).toBe(false);
    expect(revisarTiendas([SIN_MARCA])).toEqual([]);
    expect(revisarTiendas([TIENDA, SIN_MARCA])).toEqual([]);
    expect(revisarDeclaracionDeIngreso([afiliacion], undefined, [SIN_MARCA])).toEqual([]);
    expect(revisarDeclaracionDeIngreso([afiliacion], undefined, [TIENDA, SIN_MARCA])).toEqual([]);
  });

  it('una sola regla de marca: `esMarcaValida`, `tieneMarca`, la puerta y `urlDeEdicion` coinciden', () => {
    for (const marca of ['marca-21', 'a_b.c', 'A~9']) {
      expect(esMarcaValida(marca), marca).toBe(true);
      expect(tieneMarca({ ...SIN_MARCA, marca }), marca).toBe(true);
    }
    for (const marca of [
      undefined,
      null,
      21,
      '',
      ' ',
      'con espacio',
      ' marca',
      'marca\t',
      'a\nb',
      // Lo que partiría o falsearía la consulta del enlace, y lo invisible.
      'm&x=1',
      'm=21',
      'm#21',
      'm?21',
      'm%2621',
      'marca\u200b',
      '\u200b',
      'marcá-21',
    ]) {
      const tienda = { ...SIN_MARCA, marca } as unknown as Tienda;
      expect(esMarcaValida(marca), JSON.stringify(marca)).toBe(false);
      expect(tieneMarca(tienda), JSON.stringify(marca)).toBe(false);
      // Lo que `tieneMarca` no da por marca tampoco lo da por buena `revisarTiendas`…
      expect(revisarTiendas([tienda]), JSON.stringify(marca)).toHaveLength(1);
      // …ni la acepta el enlace.
      expect(() => urlDeEdicion({ url: `https://${DOMINIO_SIN_MARCA}/x` }, tienda as TiendaConMarca)).toThrow(
        SIN_MARCA.clave,
      );
    }
    expect(tieneMarca(SIN_MARCA)).toBe(false);
    expect(tieneMarca(TIENDA)).toBe(true);
  });

  it('el fallo de una marca presente dice qué tiene: sin valor, no texto o caracteres que no valen', () => {
    const fallo = (marca: unknown) => revisarTiendas([{ ...SIN_MARCA, marca } as unknown as Tienda]).join();
    expect(fallo(undefined)).toContain('`undefined`');
    for (const marca of [null, 21]) {
      expect(fallo(marca), JSON.stringify(marca)).toContain('no es texto');
      expect(fallo(marca), JSON.stringify(marca)).not.toContain('`undefined`');
    }
    expect(fallo('m&x=1')).toContain('"m&x=1"');
    expect(fallo('m&x=1')).toContain('no es una marca');
  });

  it('una marca en blanco, con espacios o escrita como `undefined` se rechaza, encendida o apagada', () => {
    for (const marca of ['', ' ', 'con espacio']) {
      const fallos = revisarTiendas([{ ...SIN_MARCA, marca }]);
      expect(fallos, JSON.stringify(marca)).toHaveLength(1);
      expect(fallos[0]).toContain('marca');
    }
    const escrita = revisarTiendas([{ ...SIN_MARCA, marca: undefined }]);
    expect(escrita).toHaveLength(1);
    expect(escrita[0]).toContain('marca');
    expect(revisarDeclaracionDeIngreso([afiliacion], undefined, [{ ...SIN_MARCA, marca: undefined }])).toHaveLength(1);
    // El parámetro se sigue exigiendo sin marca.
    expect(revisarTiendas([{ ...SIN_MARCA, parametro: '' }]).join()).toContain('parámetro');
  });

  it('encendida con una con marca y otra sin, la puerta nombra solo la que no la tiene', () => {
    const fallos = revisarDeclaracionDeIngreso([encendida], undefined, [TIENDA, SIN_MARCA]);
    expect(fallos).toHaveLength(1);
    expect(fallos[0]).toContain(`«${SIN_MARCA.clave}»`);
    expect(fallos[0]).toContain(SIN_MARCA.nombre);
    expect(fallos[0]).not.toContain(TIENDA.clave);
    expect(fallos[0]).not.toContain(TIENDA.nombre);
    expect(fallos[0]).toContain('no se enciende');
  });

  it('encendida con dos sin marca, las nombra a las dos', () => {
    const otra: Tienda = { ...SIN_MARCA, clave: 'otra-sin-marca', nombre: 'Otra sin Marca', dominio: 'otra.example' };
    const fallos = revisarDeclaracionDeIngreso([encendida], undefined, [SIN_MARCA, otra]);
    expect(fallos).toHaveLength(1);
    expect(fallos[0]).toContain(`«${SIN_MARCA.clave}»`);
    expect(fallos[0]).toContain(`«${otra.clave}»`);
    expect(fallos[0]).toContain('2 tiendas de TIENDAS no tienen marca');
  });

  it('el ayudante de las copias escapa cada valor y escribe la `marca` solo si la tienda tiene el campo', async () => {
    const fuente = await readFile(join(RAIZ, 'src/lib/ingreso.ts'), 'utf8');
    const rara: Tienda = { ...SIN_MARCA, nombre: "L'Atelier \\ de Prueba" };
    const parcheada = fuenteConTiendaDePrueba(fuente, [rara, { ...SIN_MARCA, clave: 'escrita', marca: undefined }, TIENDA]);
    expect(parcheada).toContain(`nombre: ${JSON.stringify(rara.nombre)}`);
    const lineas = parcheada.split('\n');
    expect(lineas.find((l) => l.includes(`clave: "${SIN_MARCA.clave}"`))).not.toContain('marca:');
    expect(lineas.find((l) => l.includes('clave: "escrita"'))).toContain('marca: undefined');
    expect(lineas.find((l) => l.includes(`clave: "${TIENDA.clave}"`))).toContain(`marca: "${TIENDA.marca}"`);
  });

  it('encendida sin tiendas sigue el fallo de la 22.9, y con todas con marca no hay fallo', () => {
    const sin = revisarDeclaracionDeIngreso([encendida], undefined, []);
    expect(sin).toHaveLength(1);
    expect(sin[0]).toContain('no declara ninguna tienda');
    const otraConMarca: TiendaConMarca = { ...TIENDA, clave: 'otra-con-marca', nombre: 'Otra', dominio: 'otra.example' };
    expect(revisarDeclaracionDeIngreso([encendida], undefined, [TIENDA, otraConMarca])).toEqual([]);
  });

  it('urlDeEdicion no acepta por su tipo una tienda sin marca, y si le llega lanza nombrándola', () => {
    let href: string | undefined;
    expect(() => {
      // @ts-expect-error — una tienda sin marca no es una `TiendaConMarca`.
      href = urlDeEdicion({ url: `https://${DOMINIO_SIN_MARCA}/x` }, SIN_MARCA);
    }).toThrow(`«${SIN_MARCA.clave}» (${SIN_MARCA.nombre})`);
    expect(href).toBeUndefined();
    // Ni por un `as` con la marca vacía: nunca `tag=` vacío ni `tag=undefined`.
    for (const marca of ['', ' ', undefined]) {
      expect(() => urlDeEdicion({ url: `https://${DOMINIO_SIN_MARCA}/x` }, { ...SIN_MARCA, marca } as TiendaConMarca)).toThrow(
        SIN_MARCA.clave,
      );
    }
  });

  it('edicionesEnVenta lanza ante una edición de tienda sin marca, nombrando tienda y ficha', () => {
    const deSinMarca = edicion({ tienda: SIN_MARCA.clave, url: `https://${DOMINIO_SIN_MARCA}/x` });
    expect(() => edicionesEnVenta([edicion(), deSinMarca], 'seneca--de-la-ira', [TIENDA, SIN_MARCA])).toThrow(
      /«seneca--de-la-ira».*«libreria-sin-marca» \(Librería sin Marca\)/,
    );
  });

  it('el esquema admite una edición de la tienda sin marca, con las reglas de siempre', () => {
    const esquema = esquemaDeObra([TIENDA, SIN_MARCA]);
    const juzgar = (campos: Record<string, unknown>) =>
      esquema.safeParse({ ...fichaBase, ediciones: [edicion({ tienda: SIN_MARCA.clave, ...campos })] });
    expect(juzgar({ url: `https://${DOMINIO_SIN_MARCA}/dp/X` }).success).toBe(true);
    expect(juzgar({ url: `https://www.${DOMINIO_SIN_MARCA}/dp/X`, formato: 'electronica' }).success).toBe(true);
    // Otro dominio —también el de la otra tienda—, un puerto, el parámetro en cualquier
    // capitalización y una dirección en claro.
    expect(mensajes(juzgar({ url: 'https://ejemplo.org/x' }))).toContain(`no es de ${DOMINIO_SIN_MARCA}`);
    expect(juzgar({ url: `https://${DOMINIO}/x` }).success).toBe(false);
    expect(mensajes(juzgar({ url: `https://${DOMINIO_SIN_MARCA}:8443/x` }))).toContain('puerto');
    for (const parametro of ['tag', 'TAG', 'Tag']) {
      expect(mensajes(juzgar({ url: `https://${DOMINIO_SIN_MARCA}/x?${parametro}=a-21` })), parametro).toContain(
        'parámetro «tag»',
      );
    }
    expect(mensajes(juzgar({ url: `http://${DOMINIO_SIN_MARCA}/x` }))).toContain('https://');
  });

  it('el informe lleva `conMarca` por tienda, sin la marca ni el parámetro, y dice «sin marca»', () => {
    const medida = { medible: false, motivo: 'x' } as never;
    const datos = datosDelInforme(medida, estadosDe(medida), [TIENDA, SIN_MARCA]);
    expect(datos.tiendas).toEqual([
      { clave: TIENDA.clave, nombre: TIENDA.nombre, dominio: DOMINIO, conMarca: true },
      { clave: SIN_MARCA.clave, nombre: SIN_MARCA.nombre, dominio: DOMINIO_SIN_MARCA, conMarca: false },
    ]);
    const json = JSON.stringify(datos);
    expect(json).not.toContain(TIENDA.marca);
    expect(json).not.toContain('"parametro"');
    expect(json).not.toContain('"marca"');

    const texto = textoDeTiendas([TIENDA, SIN_MARCA]);
    expect(texto).toContain(`${SIN_MARCA.nombre} (${DOMINIO_SIN_MARCA}, sin marca)`);
    expect(texto).toContain(`${TIENDA.nombre} (${DOMINIO})`);
    expect(texto).not.toContain(`${TIENDA.nombre} (${DOMINIO}, sin marca)`);
    expect(texto).toContain('la afiliación no se enciende');
    expect(textoDeTiendas([TIENDA])).not.toContain('sin marca');
    const informe = lineasDelInforme(estadosDe(medida), [TIENDA, SIN_MARCA]).join('\n');
    expect(informe).toContain(', sin marca)');
    // Sin ninguna tienda, el texto dice que la primera se declara sin marca o con ella.
    expect(textoDeTiendas([])).toContain('ninguna tienda declarada');
    expect(textoDeTiendas([])).toContain('sin marca o con ella');
    expect(informe).toContain('dispara la SOLICITUD');
  });
});

describe('Historia 22.9 — el aviso de ediciones sin edición cotejada', () => {
  const ficha = (nombre: string, conEdiciones: boolean): FichaDeObra => ({
    nombre,
    ruta: `corpus/obras/${nombre}.yml`,
    autor: 'seneca',
    titulo: nombre,
    formas: [nombre.replace('seneca--', '').replaceAll('-', ' ')],
    ...(conEdiciones ? { ediciones: [{ tienda: TIENDA.clave, formato: 'impresa' as const, url: 'https://x' }] } : {}),
  });

  it('avisa de la ficha con ediciones y ninguna Cita cotejada, y solo de ella', () => {
    const fichas = [ficha('seneca--de-la-ira', true), ficha('seneca--cartas', true), ficha('seneca--otra', false)];
    const citas = [
      { slug: 'seneca-a', autor: 'seneca', procedencia: { obra: 'De la ira' }, fuente: null },
      { slug: 'seneca-b', autor: 'seneca', procedencia: { obra: 'Cartas' }, fuente: { id: 'wikisource-es' } },
      { slug: 'seneca-c', autor: 'seneca', procedencia: { obra: 'Otra' } },
    ];
    const avisos = avisosDeEdicionesSinCotejada(fichas, citas);
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toContain('corpus/obras/seneca--de-la-ira.yml');
    expect(avisos[0]).toContain('nunca va sola');
    // Y la Obra resuelta lleva sus ediciones, como lleva la nota.
    expect(resolverObras(citas, fichas).get('seneca--cartas')?.ediciones).toHaveLength(1);
    expect(resolverObras(citas, fichas).get('seneca--otra')).not.toHaveProperty('ediciones');
  });
});

describe('Historia 22.9 — la orden `edicion`', () => {
  const temporales: string[] = [];
  afterEach(async () => {
    await Promise.all(temporales.splice(0).map((d) => rm(d, { recursive: true, force: true })));
  });

  async function corpusConFicha(): Promise<string> {
    const raiz = await mkdtemp(join(tmpdir(), 'sabiduria-edicion-'));
    temporales.push(raiz);
    const corpus = join(raiz, 'corpus');
    for (const dir of ['citas', 'autores', 'temas', '_revision', 'obras']) {
      await mkdir(join(corpus, dir), { recursive: true });
    }
    await writeFile(join(corpus, 'autores', 'seneca.yml'), 'nombre: Séneca\nsemblanza: Filósofo.\n', 'utf8');
    await escribirCita(join(corpus, 'citas'), 'seneca--a', {
      texto: 'Texto.',
      autor: 'seneca',
      slug: 'seneca-a',
      procedencia: { obra: 'Cartas a Lucilio', año: 64 },
      estadoDerechos: 'dominio-público',
    });
    await writeFile(
      join(corpus, 'obras', 'seneca--cartas-a-lucilio.yml'),
      'autor: "seneca"\ntitulo: "Cartas a Lucilio"\nformas:\n  - "cartas a lucilio"\nnota: "Una nota."\n',
      'utf8',
    );
    return corpus;
  }

  const FICHA = 'seneca--cartas-a-lucilio';
  const leerFicha = (corpus: string) => readFile(join(corpus, 'obras', `${FICHA}.yml`), 'utf8');

  it('añade la edición validada, conserva la nota y no repite', async () => {
    const corpus = await corpusConFicha();
    const rutas = rutasDelCorpus(corpus);
    const hecho = await declararEdicion(
      rutas,
      FICHA,
      { tienda: TIENDA.clave, formato: 'electronica', url: `https://www.${DOMINIO}/dp/X?th=1`, descripcion: 'Austral' },
      { tiendas: [TIENDA], congelacion: null },
    );
    expect(hecho.ok, hecho.ok ? '' : hecho.motivos.join('\n')).toBe(true);
    const escrita = await leerFicha(corpus);
    expect(escrita).toContain('nota: "Una nota."');
    expect(escrita).toContain(
      `ediciones:\n  - tienda: "${TIENDA.clave}"\n    formato: "electronica"\n    url: "https://www.${DOMINIO}/dp/X?th=1"\n    descripcion: "Austral"\n`,
    );
    // La marca nunca se escribe en la ficha.
    expect(escrita).not.toContain(TIENDA.marca);
    // El parte numera las ediciones —es la posición que toma `quitar-edicion`— y avisa, con el
    // predicado del build, de que sin Cita cotejada no se pintarán (la del corpus no tiene Fuente).
    const parte = hecho.ok ? hecho.mensaje : '';
    expect(parte).toContain(`1. electrónica en ${TIENDA.nombre} — https://www.${DOMINIO}/dp/X?th=1 («Austral»)`);
    expect(parte).toContain('no se pintarán');

    const otra = await declararEdicion(
      rutas,
      FICHA,
      { tienda: TIENDA.clave, formato: 'electronica', url: `https://www.${DOMINIO}/dp/X?th=1` },
      { tiendas: [TIENDA], congelacion: null },
    );
    expect(otra.ok).toBe(false);
    expect(await leerFicha(corpus)).toBe(escrita);
  });

  it('una Obra con Cita cotejada no recibe el aviso', async () => {
    const corpus = await corpusConFicha();
    await escribirCita(join(corpus, 'citas'), 'seneca--a', {
      texto: 'Texto.',
      autor: 'seneca',
      slug: 'seneca-a',
      procedencia: { obra: 'Cartas a Lucilio', año: 64 },
      fuente: { id: 'wikisource-es', url: 'https://es.wikisource.org/wiki/Cartas' },
      estadoDerechos: 'dominio-público',
    });
    const hecho = await declararEdicion(
      rutasDelCorpus(corpus),
      FICHA,
      { tienda: TIENDA.clave, formato: 'impresa', url: `https://${DOMINIO}/x` },
      { tiendas: [TIENDA], congelacion: null },
    );
    expect(hecho.ok, hecho.ok ? '' : hecho.motivos.join('\n')).toBe(true);
    expect(hecho.ok ? hecho.mensaje : '').not.toContain('no se pintarán');
  });

  it('quitar-edicion quita la de esa posición, y con la última omite el campo', async () => {
    const corpus = await corpusConFicha();
    const rutas = rutasDelCorpus(corpus);
    const opciones = { tiendas: [TIENDA], congelacion: null };
    const original = await leerFicha(corpus);
    for (const camino of ['/uno', '/dos']) {
      const r = await declararEdicion(rutas, FICHA, { tienda: TIENDA.clave, formato: 'impresa', url: `https://${DOMINIO}${camino}` }, opciones);
      expect(r.ok).toBe(true);
    }
    const conDos = await leerFicha(corpus);

    const fuera = await quitarEdicion(rutas, FICHA, 3, { tiendas: [TIENDA] });
    expect(fuera.ok).toBe(false);
    expect(fuera.ok ? '' : fuera.motivos.join('\n')).toContain('no tiene la edición 3: declara 2');
    expect(await leerFicha(corpus)).toBe(conDos);

    const primera = await quitarEdicion(rutas, FICHA, 1, { tiendas: [TIENDA] });
    expect(primera.ok, primera.ok ? '' : primera.motivos.join('\n')).toBe(true);
    const conUna = await leerFicha(corpus);
    expect(conUna).not.toContain('/uno');
    expect(conUna).toContain('/dos');
    expect(primera.ok ? primera.mensaje : '').toContain(`1. impresa en ${TIENDA.nombre} — https://${DOMINIO}/dos`);

    expect((await quitarEdicion(rutas, FICHA, 1, { tiendas: [TIENDA] })).ok).toBe(true);
    // Sin ediciones, el campo se omite: la ficha vuelve a ser la de antes, byte a byte.
    expect(await leerFicha(corpus)).toBe(original);
    expect(await leerFicha(corpus)).not.toContain('ediciones');
    const vacia = await quitarEdicion(rutas, FICHA, 1, { tiendas: [TIENDA] });
    expect(vacia.ok ? '' : vacia.motivos.join()).toContain('no declara ninguna edición');
  });

  it('con la familia congelada se niega y no escribe', async () => {
    const corpus = await corpusConFicha();
    const antes = await leerFicha(corpus);
    const hecho = await declararEdicion(
      rutasDelCorpus(corpus),
      FICHA,
      { tienda: TIENDA.clave, formato: 'impresa', url: `https://${DOMINIO}/x` },
      { tiendas: [TIENDA], congelacion: { desde: '2026-12-06', indexables: [] } },
    );
    expect(hecho.ok).toBe(false);
    expect(hecho.ok ? '' : hecho.motivos.join()).toMatch(/congelada desde el 2026-12-06/);
    expect(await leerFicha(corpus)).toBe(antes);
  });

  it('lo que el esquema rechaza no se escribe', async () => {
    const corpus = await corpusConFicha();
    const antes = await leerFicha(corpus);
    for (const url of ['https://ejemplo.org/x', `https://${DOMINIO}/x?tag=otro-21`]) {
      const hecho = await declararEdicion(
        rutasDelCorpus(corpus),
        FICHA,
        { tienda: TIENDA.clave, formato: 'impresa', url },
        { tiendas: [TIENDA], congelacion: null },
      );
      expect(hecho.ok, url).toBe(false);
    }
    expect(await leerFicha(corpus)).toBe(antes);
  });

  it('reunir conserva las ediciones de la destino y no hereda las de la absorbida, y lo dice', async () => {
    const corpus = await corpusConFicha();
    const rutas = rutasDelCorpus(corpus);
    const opciones = { tiendas: [TIENDA], congelacion: null };
    await writeFile(
      join(corpus, 'obras', 'seneca--epistolas.yml'),
      'autor: "seneca"\ntitulo: "Epístolas"\nformas:\n  - "epistolas"\n',
      'utf8',
    );
    for (const [ficha, url] of [
      [FICHA, `https://${DOMINIO}/destino`],
      ['seneca--epistolas', `https://${DOMINIO}/absorbida`],
    ]) {
      const hecho = await declararEdicion(rutas, ficha, { tienda: TIENDA.clave, formato: 'impresa', url }, opciones);
      expect(hecho.ok, hecho.ok ? '' : hecho.motivos.join('\n')).toBe(true);
    }
    const hecho = await reunirFichas(rutas, FICHA, 'seneca--epistolas', esquemaDeObra([TIENDA]));
    expect(hecho.ok, hecho.ok ? '' : hecho.motivos.join('\n')).toBe(true);
    const reunida = await leerFicha(corpus);
    expect(reunida).toContain('nota: "Una nota."');
    expect(reunida).toContain(`https://${DOMINIO}/destino`);
    expect(reunida).not.toContain('absorbida');
    expect(hecho.ok ? hecho.mensaje : '').toContain('La edición en venta de «seneca--epistolas» no pasa a la reunida');
  });

  it('Historia 33.1 — con una tienda sin marca escribe la edición, y el parte dice que no se pintará', async () => {
    const corpus = await corpusConFicha();
    const url = `https://www.${DOMINIO_SIN_MARCA}/dp/S1`;
    const hecho = await declararEdicion(
      rutasDelCorpus(corpus),
      FICHA,
      { tienda: SIN_MARCA.clave, formato: 'impresa', url },
      { tiendas: [SIN_MARCA], congelacion: null },
    );
    expect(hecho.ok, hecho.ok ? '' : hecho.motivos.join('\n')).toBe(true);
    expect(await leerFicha(corpus)).toContain(`  - tienda: "${SIN_MARCA.clave}"\n    formato: "impresa"\n    url: "${url}"\n`);
    const parte = hecho.ok ? hecho.mensaje : '';
    expect(parte).toContain(`La tienda «${SIN_MARCA.clave}» (${SIN_MARCA.nombre}) no tiene marca`);
    expect(parte).toContain('no se pintará hasta que Héctor declare la marca y encienda el Modelo');
    // La frase general («la pone el build») no acompaña a la tienda sin marca: la contradiría.
    expect(parte).not.toContain('La marca de afiliado la pone el build');

    // Con marca, el parte no lo dice.
    const otra = await corpusConFicha();
    const conMarca = await declararEdicion(
      rutasDelCorpus(otra),
      FICHA,
      { tienda: TIENDA.clave, formato: 'impresa', url: `https://${DOMINIO}/x` },
      { tiendas: [TIENDA, SIN_MARCA], congelacion: null },
    );
    expect(conMarca.ok ? conMarca.mensaje : '').not.toContain('no tiene marca');
    expect(conMarca.ok ? conMarca.mensaje : '').toContain('La marca de afiliado la pone el build');

    // Sin ninguna tienda declarada, el rechazo dice que la primera se declara sin marca o con ella.
    const vacia = await declararEdicion(
      rutasDelCorpus(await corpusConFicha()),
      FICHA,
      { tienda: SIN_MARCA.clave, formato: 'impresa', url: `https://${DOMINIO_SIN_MARCA}/x` },
      { tiendas: [], congelacion: null },
    );
    expect(vacia.ok).toBe(false);
    expect(vacia.ok ? '' : vacia.motivos.join('\n')).toContain('sin marca o con ella');
  });

  it('Historia 33.1 — con una tienda sin marca y la familia congelada se niega, no escribe y conserva lo declarado', async () => {
    const corpus = await corpusConFicha();
    const previa = `https://${DOMINIO_SIN_MARCA}/previa`;
    const declarada = await declararEdicion(
      rutasDelCorpus(corpus),
      FICHA,
      { tienda: SIN_MARCA.clave, formato: 'electronica', url: previa },
      { tiendas: [SIN_MARCA], congelacion: null },
    );
    expect(declarada.ok, declarada.ok ? '' : declarada.motivos.join('\n')).toBe(true);
    const antes = await leerFicha(corpus);
    expect(antes).toContain(previa);
    const hecho = await declararEdicion(
      rutasDelCorpus(corpus),
      FICHA,
      { tienda: SIN_MARCA.clave, formato: 'impresa', url: `https://${DOMINIO_SIN_MARCA}/x` },
      { tiendas: [SIN_MARCA], congelacion: { desde: '2026-12-06', indexables: [] } },
    );
    expect(hecho.ok).toBe(false);
    expect(hecho.ok ? '' : hecho.motivos.join()).toMatch(/congelada desde el 2026-12-06/);
    expect(await leerFicha(corpus)).toBe(antes);
  });

  async function correr(corpus: string, argumentos: string[]) {
    try {
      const { stdout, stderr } = await ejecutar(
        'npx',
        ['tsx', join(RAIZ, 'tools/obra.ts'), ...argumentos, '--corpus', corpus],
        { cwd: RAIZ },
      );
      return { codigo: 0, salida: stdout, error: stderr };
    } catch (fallo) {
      const f = fallo as { code?: number; stdout?: string; stderr?: string };
      return { codigo: f.code ?? 1, salida: f.stdout ?? '', error: f.stderr ?? '' };
    }
  }

  it('desde la línea de órdenes, con el conjunto vacío toda tienda se rechaza con 1', async () => {
    const corpus = await corpusConFicha();
    const antes = await leerFicha(corpus);
    const hecho = await correr(corpus, ['edicion', FICHA, 'amazon-mx', 'impresa', 'https://www.amazon.com.mx/dp/X']);
    expect(hecho.codigo, hecho.error).toBe(1);
    expect(hecho.error).toContain('hoy no declara ninguna');
    expect(await leerFicha(corpus)).toBe(antes);
  }, 60_000);

  it('quitar-edicion de una posición que la ficha no tiene sale con 1', async () => {
    const corpus = await corpusConFicha();
    const antes = await leerFicha(corpus);
    const hecho = await correr(corpus, ['quitar-edicion', FICHA, '1']);
    expect(hecho.codigo, hecho.error).toBe(1);
    expect(hecho.error).toContain('no declara ninguna edición');
    expect(await leerFicha(corpus)).toBe(antes);
  }, 60_000);

  it.each([
    ['sin dirección', ['edicion', FICHA, 'x', 'impresa']],
    ['con un argumento de más', ['edicion', FICHA, 'x', 'impresa', 'https://a.example/', 'sobra']],
    ['con una bandera que no existe', ['edicion', FICHA, 'x', 'impresa', 'https://a.example/', '--precio', '3']],
    ['con --descripcion sin valor', ['edicion', FICHA, 'x', 'impresa', 'https://a.example/', '--descripcion']],
    ['con --descripcion en blanco', ['edicion', FICHA, 'x', 'impresa', 'https://a.example/', '--descripcion', '   ']],
    ['quitar-edicion sin posición', ['quitar-edicion', FICHA]],
    ['quitar-edicion con una posición que no es número', ['quitar-edicion', FICHA, 'x']],
    ['quitar-edicion con la posición 0', ['quitar-edicion', FICHA, '0']],
    ['quitar-edicion con un argumento de más', ['quitar-edicion', FICHA, '1', '2']],
  ])('%s sale con 2 y no escribe', async (_caso, argumentos) => {
    const corpus = await corpusConFicha();
    const antes = await leerFicha(corpus);
    const hecho = await correr(corpus, argumentos);
    expect(hecho.codigo, hecho.error).toBe(2);
    expect(await leerFicha(corpus)).toBe(antes);
  }, 60_000);
});

// ─── Construido ──────────────────────────────────────────────────────────────

/*
 * El corpus de las construcciones:
 *
 *   · «Sobre la brevedad de la vida»: 51 Citas cotejadas —hay página 2— y dos ediciones en
 *     venta, una con descripción y otra con consulta y sin ella.
 *   · «Cartas a Lucilio»: una Cita cotejada (no se indexa) y una edición.
 *   · «De la ira»: una Cita sin documento (estado c) y una edición: no se pinta y avisa.
 *
 * La Cita sin documento tiene que estar en el censo de cotejo, y con el censo en el fixture el
 * andamio deja de sembrar documentos: se escriben aquí.
 */
const WS = { id: 'wikisource-es', nombre: 'Wikisource en español', licencia: 'CC BY-SA 4.0' };
const URL_BREVEDAD = 'https://es.wikisource.org/wiki/Sobre_la_brevedad_de_la_vida';
const URL_CARTAS = 'https://es.wikisource.org/wiki/Cartas_a_Lucilio';
const IRA_SIN = 'seneca-no-hay-viento-favorable-para-el-que';
const BREVEDAD = Array.from({ length: 51 }, (_, i) => `La brevedad ${i}: la vida es larga si se sabe usar, dijo él.`);
const CARTAS = 'Nadie se hace sabio por casualidad.';

const documento = (obra: string, url: string, textos: string[]) =>
  componerDocumento({ fuente: 'wikisource-es', obra, url, recuperado: '2026-08-21' }, obra, textos.join('\n\n'));

const fichaYaml = (nombre: string, titulo: string, ediciones: string[] | undefined) =>
  [
    'autor: "seneca"',
    `titulo: "${titulo}"`,
    'formas:',
    `  - "${nombre}"`,
    ...(ediciones === undefined ? [] : ['ediciones:', ...ediciones]),
    '',
  ].join('\n');

const ed = (formato: string, url: string, descripcion?: string, tienda: Tienda = TIENDA) =>
  [
    `  - tienda: "${tienda.clave}"`,
    `    formato: "${formato}"`,
    `    url: "${url}"`,
    ...(descripcion === undefined ? [] : [`    descripcion: "${descripcion}"`]),
  ].join('\n');

/**
 * De qué tienda son las ediciones de las fichas (Historia 33.1): ninguna, la de prueba con marca
 * —lo que construye `construida(...)`—, la de prueba sin marca, o las dos.
 */
type EdicionesDelCorpus = 'ninguna' | 'con-marca' | 'sin-marca' | 'ambas';

function corpusConstruido(deTienda: EdicionesDelCorpus): Record<string, string> {
  const conEdiciones = deTienda !== 'ninguna';
  /** Las ediciones de una ficha, con la tienda que toque; con las dos, una más de la sin marca. */
  const eds = (lineas: [string, string, string?][]): string[] => {
    const tienda = deTienda === 'sin-marca' ? SIN_MARCA : TIENDA;
    const dominio = tienda.dominio;
    const propias = lineas.map(([formato, url, descripcion]) => ed(formato, url.replace(DOMINIO, dominio), descripcion, tienda));
    return deTienda === 'ambas'
      ? [...propias, ed('impresa', `https://www.${DOMINIO_SIN_MARCA}/dp/S1`, undefined, SIN_MARCA)]
      : propias;
  };
  const corpus: Record<string, string> = {
    'autores/seneca.yml': AUTOR_VALIDO,
    'temas/el-tiempo.yml': TEMA_VALIDO,
    'pendientes-de-cotejo.yml': `citas:\n  - ${IRA_SIN}\n`,
    'obras/seneca--sobre-la-brevedad-de-la-vida.yml': fichaYaml(
      'sobre la brevedad de la vida',
      'Sobre la brevedad de la vida',
      conEdiciones
        ? eds([['impresa', `https://www.${DOMINIO}/dp/B1`, 'Cátedra, 2015.'], ['electronica', `https://${DOMINIO}/e/B2?th=1`]])
        : undefined,
    ),
    'obras/seneca--cartas-a-lucilio.yml': fichaYaml(
      'cartas a lucilio',
      'Cartas a Lucilio',
      conEdiciones ? eds([['impresa', `https://www.${DOMINIO}/dp/C1`]]) : undefined,
    ),
    'obras/seneca--de-la-ira.yml': fichaYaml(
      'de la ira',
      'De la ira',
      conEdiciones ? eds([['impresa', `https://www.${DOMINIO}/dp/I1`]]) : undefined,
    ),
    'fuentes/wikisource-es--sobre-la-brevedad-de-la-vida.txt': documento(
      'Sobre la brevedad de la vida',
      URL_BREVEDAD,
      BREVEDAD,
    ),
    'fuentes/wikisource-es--cartas-a-lucilio.txt': documento('Cartas a Lucilio', URL_CARTAS, [CARTAS]),
    'citas/seneca--cartas-1.md': citaValida({
      slug: 'seneca-cartas-1',
      texto: CARTAS,
      procedencia: { obra: 'Cartas a Lucilio', año: 64 },
      fuente: { ...WS, url: URL_CARTAS },
    }),
    [`citas/${IRA_SIN.replace(/^seneca-/, 'seneca--')}.md`]: citaValida({
      slug: IRA_SIN,
      texto: 'No hay viento favorable para el que no sabe adónde va.',
      procedencia: { obra: 'De la ira', año: 41 },
      fuente: undefined,
    }),
  };
  BREVEDAD.forEach((texto, i) => {
    corpus[`citas/seneca--brevedad-${String(i).padStart(2, '0')}.md`] = citaValida({
      slug: `seneca-brevedad-${String(i).padStart(2, '0')}`,
      texto,
      procedencia: { obra: 'Sobre la brevedad de la vida', año: 49 },
      fuente: { ...WS, url: URL_BREVEDAD },
    });
  });
  return corpus;
}

const PAGINA_1 = '/obra/seneca/sobre-la-brevedad-de-la-vida/';
const PAGINA_2 = '/obra/seneca/sobre-la-brevedad-de-la-vida/2/';
const CARTAS_1 = '/obra/seneca/cartas-a-lucilio/';
const IRA_1 = '/obra/seneca/de-la-ira/';

const aLimpiar: string[] = [];
afterAll(async () => {
  await Promise.all(aLimpiar.splice(0).map(limpiar));
});

/**
 * La sección «Dónde leer esta obra» entera, con su `</section>` de cierre contando la anidada
 * (la parte de la edición cotejada); el mismo recorte que `obra-pagina.test.ts`.
 */
function seccionDondeLeer(pagina: string): string {
  const inicio = pagina.indexOf('<section class="donde-leer"');
  if (inicio === -1) return '';
  const etiquetas = /<section\b|<\/section>/g;
  etiquetas.lastIndex = inicio;
  let profundidad = 0;
  for (let m = etiquetas.exec(pagina); m !== null; m = etiquetas.exec(pagina)) {
    profundidad += m[0] === '</section>' ? -1 : 1;
    if (profundidad === 0) return pagina.slice(inicio, m.index + m[0].length);
  }
  return '';
}

/** El `<div data-ingreso>` completo, contando anidamiento. */
function bloqueDeEdiciones(html: string): string {
  const inicio = html.lastIndexOf('<div', html.indexOf('data-ingreso="afiliacion-de-libros"'));
  if (inicio === -1 || !html.includes('data-ingreso')) return '';
  const marcas = /<div\b|<\/div>/g;
  marcas.lastIndex = inicio;
  let profundidad = 0;
  for (let m = marcas.exec(html); m !== null; m = marcas.exec(html)) {
    profundidad += m[0] === '</div>' ? -1 : 1;
    if (profundidad === 0) return html.slice(inicio, m.index + m[0].length);
  }
  return '';
}

/**
 * La fuente de `src/lib/ingreso.ts` con la tienda de prueba declarada y la afiliación como se
 * pida. Una sola, para que toda construcción que se compara con otra declare la misma tienda.
 */
async function ingresoConTienda(afiliacion: 'encendida' | 'apagada'): Promise<string> {
  const conTienda = fuenteConTiendaDePrueba(await readFile(resolve(RAIZ, 'src/lib/ingreso.ts'), 'utf8'));
  return afiliacion === 'encendida' ? fuenteConModeloEncendido(conTienda, 'afiliacion-de-libros') : conTienda;
}

/**
 * Las dos construcciones de `corpusConstruido('con-marca')` —la tienda de prueba declarada, con la
 * afiliación encendida y apagada—, memorizadas para el fichero: la 22.9 y la 24.7 las comparten
 * sin construir más. La primera `describe` que la pide la construye; las demás esperan la misma.
 * Se comparten porque son de solo lectura: ninguna prueba escribe en su proyecto, y las borra el
 * `afterAll` del fichero, que corre después de la última prueba de todas sus `describe`.
 */
type Construida = Awaited<ReturnType<typeof construirConCorpus>>;
const memorizadas = new Map<'encendida' | 'apagada', Promise<Construida>>();
function construida(afiliacion: 'encendida' | 'apagada'): Promise<Construida> {
  let promesa = memorizadas.get(afiliacion);
  if (promesa === undefined) {
    promesa = (async () => {
      const ingreso = await ingresoConTienda(afiliacion);
      const resultado = await construirConCorpus(corpusConstruido('con-marca'), { ficheros: { 'src/lib/ingreso.ts': ingreso } });
      aLimpiar.push(resultado.proyecto);
      return resultado;
    })();
    memorizadas.set(afiliacion, promesa);
  }
  return promesa;
}

describe('Historia 22.9 — encendida, construida', () => {
  let proyecto = '';
  let salida = '';
  const html = (ruta: string) => readFile(paginaConstruida(proyecto, ruta), 'utf8');

  beforeAll(async () => {
    const resultado = await construida('encendida');
    expect(resultado.codigo, resultado.salida).toBe(0);
    proyecto = resultado.proyecto;
    salida = resultado.salida;
  }, 300_000);

  it('con edición cotejada: un único bloque, dentro de «Dónde leer», con dos ediciones', async () => {
    const pagina = await html(PAGINA_1);
    expect(modelosMarcadosEn(pagina)).toEqual(['afiliacion-de-libros']);
    const bloque = bloqueDeEdiciones(pagina);
    expect(bloque).toMatch(/^<div data-ingreso="afiliacion-de-libros" style="margin-top: calc\(var\(--unidad\) \* 2\)">/);
    expect(bloque).not.toContain('<aside');
    expect(bloque).toMatch(/<h3[^>]*>Ediciones en venta<\/h3>/);
    expect(bloque.match(/<li\b/g)).toHaveLength(2);

    // Contenido en la `section.donde-leer` exterior —con su cierre, contando la anidada— y
    // después de la parte cotejada.
    const seccion = seccionDondeLeer(pagina);
    expect(seccion).toContain(bloque);
    expect(seccion.indexOf(bloque)).toBeGreaterThan(seccion.indexOf('Edición cotejada, gratuita'));
    expect(pagina.split(bloque)).toHaveLength(2);
    // Una descripción que ya cierra con punto no lleva otro.
    expect(bloque).toContain('Cátedra, 2015. <span');
    expect(bloque).not.toContain('2015..');

    const enlaces = [...bloque.matchAll(/<a ([^>]*)>([\s\S]*?)<\/a>/g)];
    expect(enlaces).toHaveLength(2);
    expect(enlaces[0][1]).toContain(`href="https://www.${DOMINIO}/dp/B1?tag=${TIENDA.marca}"`);
    expect(enlaces[1][1]).toContain(`href="https://${DOMINIO}/e/B2?th=1&amp;tag=${TIENDA.marca}"`);
    for (const [i, [, atributos, texto]] of enlaces.entries()) {
      expect(atributos).toContain('rel="sponsored noopener"');
      expect(atributos).toContain('target="_blank"');
      const descrito = /aria-describedby="([^"]+)"/.exec(atributos)?.[1];
      expect(descrito).toBe(`edicion-en-venta-${i + 1}-afiliado`);
      expect(bloque).toContain(
        `<span id="${descrito}">Enlace de afiliado: si compras, el sitio recibe una comisión sin coste para ti.</span>`,
      );
      expect(texto).toContain('(se abre en una pestaña nueva)');
    }
    const lineas = [...bloque.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) =>
      m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
    );
    expect(lineas).toEqual([
      `Edición impresa en ${TIENDA.nombre} (se abre en una pestaña nueva): Cátedra, 2015. Enlace de afiliado: si compras, el sitio recibe una comisión sin coste para ti.`,
      `Edición electrónica en ${TIENDA.nombre} (se abre en una pestaña nueva). Enlace de afiliado: si compras, el sitio recibe una comisión sin coste para ti.`,
    ]);
  });

  it('la página 2 no lleva ni bloque ni marca', async () => {
    const pagina = await html(PAGINA_2);
    expect(pagina).not.toContain('data-ingreso');
    expect(pagina).not.toContain('Ediciones en venta');
  });

  it('una Obra noindex lleva el bloque en su página 1', async () => {
    const pagina = await html(CARTAS_1);
    expect(pagina).toMatch(/<meta name="robots" content="noindex, follow"/);
    expect(modelosMarcadosEn(pagina)).toEqual(['afiliacion-de-libros']);
    expect(bloqueDeEdiciones(pagina).match(/<li\b/g)).toHaveLength(1);
  });

  it('sin edición cotejada no hay bloque, y el build lo avisa nombrando la ficha', async () => {
    const pagina = await html(IRA_1);
    expect(pagina).not.toContain('data-ingreso');
    expect(pagina).toContain('Ninguna de sus citas tiene todavía documento cotejado.');
    expect(salida).toContain('Ediciones sin edición cotejada: corpus/obras/seneca--de-la-ira.yml');
  });

  it('ninguna otra superficie lleva la marca', async () => {
    const dist = join(proyecto, 'dist');
    const entradas = await readdir(dist, { recursive: true, withFileTypes: true });
    const marcadas: string[] = [];
    for (const e of entradas) {
      if (!e.isFile() || !e.name.endsWith('.html')) continue;
      const completa = join(e.parentPath, e.name);
      if ((await readFile(completa, 'utf8')).includes('data-ingreso')) marcadas.push(completa.slice(dist.length + 1));
    }
    expect(marcadas.sort()).toEqual([
      'obra/seneca/cartas-a-lucilio/index.html',
      'obra/seneca/sobre-la-brevedad-de-la-vida/index.html',
    ]);
  });
});

/*
 * Historias 22.9 y 33.1 — apagada, `dist/` sale idéntico byte a byte en las cuatro variantes:
 * sin tiendas ni ediciones (el `src/lib/ingreso.ts` del árbol), la tienda con marca y sus
 * ediciones (`construida('apagada')`), la tienda sin marca y sus ediciones, y las dos tiendas con
 * ediciones de ambas. Todas sin `entorno`, así que con el mismo `MEDICION_ENDPOINT`.
 */
describe('Historias 22.9 y 33.1 — apagada, `dist/` igual con tiendas con marca o sin ella y con ediciones o sin ellas', () => {
  const variantes: Record<string, Record<string, string>> = {};
  let salidaCon = '';
  let proyectoConLasDos = '';

  async function huellas(proyecto: string): Promise<Record<string, string>> {
    const dist = join(proyecto, 'dist');
    const entradas = await readdir(dist, { recursive: true, withFileTypes: true });
    const salida: Record<string, string> = {};
    for (const e of entradas) {
      if (!e.isFile()) continue;
      const completa = join(e.parentPath, e.name);
      salida[completa.slice(dist.length + 1)] = createHash('sha256').update(await readFile(completa)).digest('hex');
    }
    return salida;
  }

  async function construirVariante(
    corpus: EdicionesDelCorpus,
    tiendas: readonly Tienda[] | undefined,
  ): Promise<Construida> {
    const arbol = await readFile(resolve(RAIZ, 'src/lib/ingreso.ts'), 'utf8');
    const ficheros: Record<string, string> =
      tiendas === undefined ? {} : { 'src/lib/ingreso.ts': fuenteConTiendaDePrueba(arbol, tiendas) };
    const resultado = await construirConCorpus(corpusConstruido(corpus), { ficheros });
    aLimpiar.push(resultado.proyecto);
    expect(resultado.codigo, resultado.salida).toBe(0);
    return resultado;
  }

  beforeAll(async () => {
    const conMarca = await construida('apagada');
    expect(conMarca.codigo, conMarca.salida).toBe(0);
    variantes['tienda con marca y sus ediciones'] = await huellas(conMarca.proyecto);
    salidaCon = conMarca.salida;
    // Una tras otra, nunca a la vez.
    const sinNada = await construirVariante('ninguna', undefined);
    variantes['sin tiendas ni ediciones'] = await huellas(sinNada.proyecto);
    const sinMarca = await construirVariante('sin-marca', [SIN_MARCA]);
    variantes['tienda sin marca y sus ediciones'] = await huellas(sinMarca.proyecto);
    const lasDos = await construirVariante('ambas', [TIENDA, SIN_MARCA]);
    variantes['las dos tiendas y ediciones de ambas'] = await huellas(lasDos.proyecto);
    proyectoConLasDos = lasDos.proyecto;
  }, 1_200_000);

  it('byte a byte: ni rótulo, ni línea, ni hueco, ni contenedor, ni regla CSS', () => {
    const referencia = variantes['sin tiendas ni ediciones'];
    expect(Object.keys(referencia).length).toBeGreaterThan(5);
    expect(Object.keys(variantes)).toHaveLength(4);
    for (const [nombre, huella] of Object.entries(variantes)) {
      expect(Object.keys(huella).sort(), nombre).toEqual(Object.keys(referencia).sort());
      expect(huella, nombre).toEqual(referencia);
    }
  });

  it('ningún HTML lleva la marca del Modelo ni el dominio de ninguna de las dos tiendas', async () => {
    const dist = join(proyectoConLasDos, 'dist');
    const entradas = await readdir(dist, { recursive: true, withFileTypes: true });
    let paginas = 0;
    for (const e of entradas) {
      if (!e.isFile() || !e.name.endsWith('.html')) continue;
      paginas += 1;
      const completa = join(e.parentPath, e.name);
      const html = await readFile(completa, 'utf8');
      expect(html, completa).not.toContain('data-ingreso="afiliacion-de-libros"');
      expect(html, completa).not.toContain(DOMINIO);
      expect(html, completa).not.toContain(DOMINIO_SIN_MARCA);
    }
    expect(paginas).toBeGreaterThan(5);
  });

  it('y el aviso de la Obra sin cotejada sale igual con la afiliación apagada', () => {
    expect(salidaCon).toContain('Ediciones sin edición cotejada: corpus/obras/seneca--de-la-ira.yml');
  });
});

/*
 * Historia 24.7 — el salto «Dónde leer esta obra ↓» y su `h2` de destino no alojan ningún Modelo:
 * salen idénticos con la afiliación encendida o apagada (FR-35, UX-DR96), y lo único que separa
 * las dos páginas es el `div[data-ingreso]` de «Ediciones en venta». Las dos construcciones son
 * las de arriba, sin construir otra.
 */
describe('Historia 24.7 — el salto, igual con la afiliación encendida o apagada', () => {
  let encendida = '';
  let apagada = '';
  const html = (proyecto: string, ruta: string) => readFile(paginaConstruida(proyecto, ruta), 'utf8');
  const salto = (pagina: string) => /<p class="salto"[\s\S]*?<\/p>/.exec(pagina)?.[0] ?? '';
  const destino = (pagina: string) =>
    /<h2 class="rotulo" id="donde-leer-esta-obra"[^>]*>[\s\S]*?<\/h2>/.exec(pagina)?.[0] ?? '';

  beforeAll(async () => {
    // Una tras otra: si esta `describe` corre sola, las construye ella, y nunca a la vez.
    const con = await construida('encendida');
    const sin = await construida('apagada');
    expect(con.codigo, con.salida).toBe(0);
    expect(sin.codigo, sin.salida).toBe(0);
    encendida = con.proyecto;
    apagada = sin.proyecto;
  }, 600_000);

  it.each([
    ['con ediciones', PAGINA_1],
    ['noindex', CARTAS_1],
    ['sin cotejo', IRA_1],
  ])('%s: el salto y su `h2` son los mismos, byte a byte', async (_caso, ruta) => {
    const [con, sin] = [await html(encendida, ruta), await html(apagada, ruta)];
    expect(salto(con), ruta).toContain('href="#donde-leer-esta-obra"');
    expect(destino(con), ruta).toContain('tabindex="-1"');
    expect(salto(con), ruta).toBe(salto(sin));
    expect(destino(con), ruta).toBe(destino(sin));
  });

  it.each([PAGINA_1, CARTAS_1])('%s: encendida es la apagada más el bloque de «Ediciones en venta»', async (ruta) => {
    const con = await html(encendida, ruta);
    const bloque = bloqueDeEdiciones(con);
    expect(bloque, ruta).toMatch(/^<div data-ingreso="afiliacion-de-libros"/);
    expect(con.split(bloque), ruta).toHaveLength(2);
    expect(con.replace(bloque, ''), ruta).toBe(await html(apagada, ruta));
  });

  it.each([IRA_1, PAGINA_2])('%s: sin bloque, las dos son iguales sin quitar nada', async (ruta) => {
    const con = await html(encendida, ruta);
    expect(con, ruta).not.toContain('data-ingreso');
    expect(con, ruta).toBe(await html(apagada, ruta));
  });
});

/*
 * Historia 24.4 — la Tarjeta de Obra no aloja ningún Modelo y no depende de la afiliación ni de
 * las `ediciones` de la ficha: en toda Página de Cita sale igual byte a byte con la afiliación
 * encendida o apagada (FR-35), y promete «dónde leerla» solo si hay edición cotejada (FR-54).
 * Las dos construcciones son las de arriba, sin construir otra.
 */
describe('Historia 24.4 — la Tarjeta de Obra, igual con la afiliación encendida o apagada', () => {
  let encendida = '';
  let apagada = '';
  let citas: string[] = [];
  const html = (proyecto: string, ruta: string) => readFile(paginaConstruida(proyecto, ruta), 'utf8');

  beforeAll(async () => {
    const con = await construida('encendida');
    const sin = await construida('apagada');
    expect(con.codigo, con.salida).toBe(0);
    expect(sin.codigo, sin.salida).toBe(0);
    encendida = con.proyecto;
    apagada = sin.proyecto;
    citas = (await readdir(join(encendida, 'dist', 'cita'))).sort();
  }, 600_000);

  it('en toda Página de Cita, la tarjeta es la misma byte a byte, y ninguna lleva `data-ingreso`', async () => {
    // Todas las Citas del fixture —las de Brevedad, la de Cartas y la de De la ira—, todas con Obra.
    const delFixture = Object.keys(corpusConstruido('con-marca')).filter((ruta) => ruta.startsWith('citas/'));
    expect(citas.length).toBeGreaterThan(0);
    expect(citas).toHaveLength(delFixture.length);
    let conSiguiente = 0;
    for (const slug of citas) {
      const ruta = `/cita/${slug}/`;
      const [con, sin] = [await html(encendida, ruta), await html(apagada, ruta)];
      const tarjeta = tarjetaDeObraDe(con);
      expect(tarjeta, ruta).toBeDefined();
      expect(tarjeta, ruta).toBe(tarjetaDeObraDe(sin));
      expect(con, ruta).not.toContain('data-ingreso');
      expect(sin, ruta).not.toContain('data-ingreso');
      if (tarjeta!.includes('<li class="fila-de-bloque" data-zona="siguiente"')) conSiguiente += 1;
    }
    // Historia 24.5 — la igualdad cubre también «Siguiente…»: alguna tarjeta comparada lo lleva.
    expect(conSiguiente).toBeGreaterThan(0);
  });

  it.each([
    ['cotejada y con ediciones', 'seneca-brevedad-00', 'Ver la obra y dónde leerla', PAGINA_1],
    ['cotejada, una Cita y con edición', 'seneca-cartas-1', 'Ver la obra y dónde leerla', CARTAS_1],
    ['sin cotejar y con ediciones', IRA_SIN, 'Ver la obra', IRA_1],
  ])('%s: la fila dice lo que toca, con la afiliación encendida', async (_caso, slug, fila, obra) => {
    const tarjeta = tarjetaDeObraDe(await html(encendida, `/cita/${slug}/`))!;
    // La fila de la Obra; delante puede ir «Siguiente…» (24.5), con su propia zona.
    const interior = /<li class="fila-de-bloque" data-zona="tarjeta-de-obra"[^>]*><a\b[^>]*>([\s\S]*?)<\/a>/.exec(tarjeta)![1];
    expect(textosDelEnlace(interior)).toEqual({ vista: `${fila} \u203A`, lector: fila });
    const deLaObra = enlacesDe(tarjeta).filter(
      (e) => e.declaracion !== null && 'zona' in e.declaracion && e.declaracion.zona === 'tarjeta-de-obra',
    );
    expect(deLaObra.map((e) => e.href)).toEqual([obra]);
    expect(enlacesDe(tarjeta).at(-1)?.href).toBe(obra);
  });
});

describe('Historia 22.9 — una edición de otro dominio rompe el build', () => {
  it('y nombra la ficha', async () => {
    const corpus = corpusConstruido('con-marca');
    corpus['obras/seneca--cartas-a-lucilio.yml'] = fichaYaml('cartas a lucilio', 'Cartas a Lucilio', [
      ed('impresa', 'https://ejemplo.org/x'),
    ]);
    const ingreso = fuenteConTiendaDePrueba(await readFile(resolve(RAIZ, 'src/lib/ingreso.ts'), 'utf8'));
    const resultado = await construirConCorpus(corpus, { ficheros: { 'src/lib/ingreso.ts': ingreso } });
    aLimpiar.push(resultado.proyecto);
    expect(resultado.codigo, resultado.salida).not.toBe(0);
    expect(resultado.salida).toContain('seneca--cartas-a-lucilio');
    expect(resultado.salida).toContain(`no es de ${DOMINIO}`);
  }, 300_000);
});
