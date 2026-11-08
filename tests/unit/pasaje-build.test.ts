import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  AUTOR_VALIDO,
  TEMA_VALIDO,
  RAIZ,
  citaValida,
  construirConCorpus,
  limpiar,
  paginaConstruida,
} from './ayuda/construir.ts';
import { componerDocumento } from '../../tools/lib/documento.ts';
import { colapsarEspacios } from '../../tools/lib/cotejo.ts';

/**
 * Historia 31.1 — el cargador de `posiciones` entrega el pasaje en una construcción de verdad
 * (AD-30): con el tope con valor —parcheado en la copia, nunca en el árbol—, la aparición con
 * pasaje lo trae validado por el esquema y la que no, sin la clave; con el tope en `undefined`
 * —el valor con el que nace, parcheado también, para no fijar el del árbol—, ninguna lo trae.
 * Una página sonda vuelca la colección y la fachada
 * `pasajesDeLasCitas`, porque ninguna página del sitio pinta el pasaje todavía (31.2).
 */

const DENTRO = 'No es que tengamos poco tiempo, es que perdemos mucho.';
const LINEA_CON_LA_CITA = `Dice el filósofo que no basta con quejarse. ${DENTRO} Y lo dice con razón.`;
const SOLA = 'La vida es larga si se sabe usar';
// Una Cita que abre su línea (`inicio` 0) y otra que la cierra (`fin` igual al largo): los
// bordes del refinamiento `inicio < fin ≤ largo` del esquema, que una Cita que es la primera o
// la última frase de su párrafo pisa a menudo en el Corpus real.
const AL_PRINCIPIO = 'Quien todo lo quiere todo lo pierde';
const LINEA_QUE_ABRE = `${AL_PRINCIPIO}, y eso lo sabe cualquiera que haya vivido.`;
const AL_FINAL = 'nadie es sabio por casualidad';
const LINEA_QUE_CIERRA = `Lo repetía el maestro a sus discípulos cada mañana: ${AL_FINAL}`;

const DOCUMENTO = componerDocumento(
  {
    fuente: 'wikisource-es',
    obra: 'Sobre la brevedad de la vida',
    año: 49,
    url: 'https://es.wikisource.org/wiki/Sobre_la_brevedad_de_la_vida',
    recuperado: '2026-11-07',
    lineas: 'prosa-por-lineas',
  },
  'Sobre la brevedad de la vida\nAño de publicación: 49',
  [LINEA_CON_LA_CITA, `${SOLA}.`, LINEA_QUE_ABRE, 'Otra línea que no es de ninguna Cita.', LINEA_QUE_CIERRA].join('\n'),
);

const CORPUS = {
  'autores/seneca.yml': AUTOR_VALIDO,
  'temas/el-tiempo.yml': TEMA_VALIDO,
  'citas/seneca--no-es-que-tengamos-poco-tiempo.md': citaValida(),
  'citas/seneca--la-vida-es-larga-si-se-sabe-usar.md': citaValida({
    texto: SOLA,
    slug: 'seneca-la-vida-es-larga-si-se-sabe-usar',
  }),
  'citas/seneca--quien-todo-lo-quiere-todo-lo-pierde.md': citaValida({
    texto: AL_PRINCIPIO,
    slug: 'seneca-quien-todo-lo-quiere-todo-lo-pierde',
  }),
  'citas/seneca--nadie-es-sabio-por-casualidad.md': citaValida({
    texto: AL_FINAL,
    slug: 'seneca-nadie-es-sabio-por-casualidad',
  }),
  'fuentes/wikisource-es--sobre-la-brevedad-de-la-vida.txt': DOCUMENTO,
};

const SONDA = `---
import { getCollection } from 'astro:content';
import { conjuntoPublicable, pasajesDeLasCitas } from '../lib/publicado.ts';
const posiciones = Object.fromEntries((await getCollection('posiciones')).map((e) => [e.id, e.data.apariciones]));
const pasajes = Object.fromEntries(await pasajesDeLasCitas(await conjuntoPublicable()));
const datos = Buffer.from(JSON.stringify({ posiciones, pasajes }), 'utf8').toString('base64');
---
<!doctype html>
<html lang="es"><head><meta charset="utf-8" /><title>Sonda</title></head>
<body><div id="sonda" data-datos={datos}></div></body></html>
`;

/**
 * La declaración del tope, **con el valor que tenga en el árbol**: la prueba no lo fija (lo da
 * Héctor en un diff visible). Las dos construcciones lo parchean en su copia —200 y `undefined`,
 * el valor con el que nace— para que dárselo no ponga esta prueba en rojo.
 */
const DECLARACION_DEL_TOPE = /^export const MAX_CARACTERES_DEL_PASAJE: number \| undefined = [^;\n]+;$/mu;

function conElTope(umbrales: string, valor: string): string {
  return umbrales.replace(DECLARACION_DEL_TOPE, `export const MAX_CARACTERES_DEL_PASAJE: number | undefined = ${valor};`);
}

interface Volcado {
  posiciones: Record<string, { documento: string; posicion: number; pasaje?: { texto: string; inicio: number; fin: number } }[]>;
  pasajes: Record<string, { texto: string; inicio: number; fin: number }>;
}

async function leerSonda(proyecto: string): Promise<Volcado> {
  const html = await readFile(paginaConstruida(proyecto, '/sonda-pasaje/'), 'utf8');
  const datos = /data-datos="([^"]+)"/u.exec(html)?.[1];
  if (datos === undefined) throw new Error('la sonda no trae sus datos');
  return JSON.parse(Buffer.from(datos, 'base64').toString('utf8')) as Volcado;
}

describe('Historia 31.1 — el pasaje en el cargador de posiciones, construido', () => {
  const aLimpiar: string[] = [];
  let conTope: Volcado;
  let sinTope: Volcado;

  beforeAll(async () => {
    const umbrales = await readFile(join(RAIZ, 'src/lib/umbrales.ts'), 'utf8');
    // Que la declaración esté, con cualquier valor: sin ella el parche no tendría dónde caer.
    expect(umbrales, 'falta la declaración de `MAX_CARACTERES_DEL_PASAJE` en `src/lib/umbrales.ts`').toMatch(
      DECLARACION_DEL_TOPE,
    );
    // Una tras otra: dos construcciones a la vez no son seguras (ver `vitest.config.ts`).
    const con = await construirConCorpus(CORPUS, {
      paginas: { 'sonda-pasaje.astro': SONDA },
      ficheros: { 'src/lib/umbrales.ts': conElTope(umbrales, '200') },
    });
    aLimpiar.push(con.proyecto);
    // Con el árbol en `undefined` el parche sería idéntico, y `construirConCorpus` lo rechaza.
    const sinElTope = conElTope(umbrales, 'undefined');
    const sin = await construirConCorpus(CORPUS, {
      paginas: { 'sonda-pasaje.astro': SONDA },
      ...(sinElTope === umbrales ? {} : { ficheros: { 'src/lib/umbrales.ts': sinElTope } }),
    });
    aLimpiar.push(sin.proyecto);
    expect(con.codigo, con.salida).toBe(0);
    expect(sin.codigo, sin.salida).toBe(0);
    conTope = await leerSonda(con.proyecto);
    sinTope = await leerSonda(sin.proyecto);
  }, 600_000);

  afterAll(async () => {
    for (const proyecto of aLimpiar) await limpiar(proyecto);
  });

  it('con tope, la aparición con pasaje lo trae: la línea entera, y el tramo de la Cita en ella', () => {
    const [aparicion] = conTope.posiciones['seneca-no-es-que-tengamos-poco-tiempo'];
    expect(aparicion.documento).toBe('wikisource-es--sobre-la-brevedad-de-la-vida');
    expect(aparicion.pasaje).toEqual({
      texto: LINEA_CON_LA_CITA,
      inicio: LINEA_CON_LA_CITA.indexOf(DENTRO),
      fin: LINEA_CON_LA_CITA.indexOf(DENTRO) + DENTRO.length,
    });
    expect(colapsarEspacios(aparicion.pasaje!.texto.slice(aparicion.pasaje!.inicio, aparicion.pasaje!.fin))).toBe(DENTRO);
    expect(conTope.pasajes['seneca-no-es-que-tengamos-poco-tiempo']).toEqual(aparicion.pasaje);
  });

  it('con tope, la que no tiene pasaje —su línea no dice más que ella— va sin la clave', () => {
    const [aparicion] = conTope.posiciones['seneca-la-vida-es-larga-si-se-sabe-usar'];
    expect(Object.keys(aparicion).sort()).toEqual(['documento', 'posicion']);
    expect('seneca-la-vida-es-larga-si-se-sabe-usar' in conTope.pasajes).toBe(false);
  });

  it('con tope, la Cita que abre su línea y la que la cierra traen el pasaje: los bordes pasan el esquema', () => {
    const [abre] = conTope.posiciones['seneca-quien-todo-lo-quiere-todo-lo-pierde'];
    expect(abre.pasaje).toEqual({ texto: LINEA_QUE_ABRE, inicio: 0, fin: AL_PRINCIPIO.length });
    const [cierra] = conTope.posiciones['seneca-nadie-es-sabio-por-casualidad'];
    expect(cierra.pasaje).toEqual({
      texto: LINEA_QUE_CIERRA,
      inicio: LINEA_QUE_CIERRA.length - AL_FINAL.length,
      fin: LINEA_QUE_CIERRA.length,
    });
    expect(conTope.pasajes['seneca-quien-todo-lo-quiere-todo-lo-pierde']).toEqual(abre.pasaje);
    expect(conTope.pasajes['seneca-nadie-es-sabio-por-casualidad']).toEqual(cierra.pasaje);
  });

  it('con el tope en `undefined`, ninguna aparición trae pasaje, y las posiciones son las mismas', () => {
    for (const apariciones of Object.values(sinTope.posiciones)) {
      for (const aparicion of apariciones) expect(Object.keys(aparicion).sort()).toEqual(['documento', 'posicion']);
    }
    expect(sinTope.pasajes).toEqual({});
    const sinPasaje = (v: Volcado) =>
      Object.fromEntries(
        Object.entries(v.posiciones).map(([slug, l]) => [slug, l.map(({ documento, posicion }) => ({ documento, posicion }))]),
      );
    expect(sinPasaje(sinTope)).toEqual(sinPasaje(conTope));
  });
});
