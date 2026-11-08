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
 * pasaje lo trae validado por el esquema y la que no, sin la clave; con el tope del árbol
 * (`undefined`), ninguna lo trae. Una página sonda vuelca la colección y la fachada
 * `pasajesDeLasCitas`, porque ninguna página del sitio pinta el pasaje todavía (31.2).
 */

const DENTRO = 'No es que tengamos poco tiempo, es que perdemos mucho.';
const LINEA_CON_LA_CITA = `Dice el filósofo que no basta con quejarse. ${DENTRO} Y lo dice con razón.`;
const SOLA = 'La vida es larga si se sabe usar';

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
  [LINEA_CON_LA_CITA, `${SOLA}.`, 'Otra línea que no es de ninguna Cita.'].join('\n'),
);

const CORPUS = {
  'autores/seneca.yml': AUTOR_VALIDO,
  'temas/el-tiempo.yml': TEMA_VALIDO,
  'citas/seneca--no-es-que-tengamos-poco-tiempo.md': citaValida(),
  'citas/seneca--la-vida-es-larga-si-se-sabe-usar.md': citaValida({
    texto: SOLA,
    slug: 'seneca-la-vida-es-larga-si-se-sabe-usar',
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

const TOPE_EN_EL_ARBOL = 'export const MAX_CARACTERES_DEL_PASAJE: number | undefined = undefined;';

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
    // La prueba sigue el valor del árbol: si Héctor le da uno, esto lo dice en vez de fijarlo.
    expect(umbrales, 'el tope del árbol cambió: esta prueba parchea la declaración en `undefined`').toContain(
      TOPE_EN_EL_ARBOL,
    );
    // Una tras otra: dos construcciones a la vez no son seguras (ver `vitest.config.ts`).
    const con = await construirConCorpus(CORPUS, {
      paginas: { 'sonda-pasaje.astro': SONDA },
      ficheros: {
        'src/lib/umbrales.ts': umbrales.replace(
          TOPE_EN_EL_ARBOL,
          'export const MAX_CARACTERES_DEL_PASAJE: number | undefined = 200;',
        ),
      },
    });
    aLimpiar.push(con.proyecto);
    const sin = await construirConCorpus(CORPUS, { paginas: { 'sonda-pasaje.astro': SONDA } });
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

  it('con el tope del árbol, ninguna aparición trae pasaje, y las posiciones son las mismas', () => {
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
