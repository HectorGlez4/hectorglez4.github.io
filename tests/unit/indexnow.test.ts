import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import {
  CLAVE_DE_INDEXNOW,
  PUNTO_DE_INDEXNOW,
  RUTA_DE_LA_CLAVE,
  TOPE_POR_AVISO,
  avisoDeIndexNow,
} from '../../src/lib/buscadores.ts';
import {
  DIRECTORIOS_AVISABLES,
  familiaDeFichero,
  rutasAfectadas,
} from '../../tools/lib/avisar.ts';

/**
 * IndexNow — lo decidible sin salir a la red.
 *
 * Aquí se prueba qué se compone, que es lo decidible sin red. Lo que no se prueba aquí
 * conviene saber quién lo sostiene: que la clave se sirva en la raíz lo sostiene
 * `src/pages/[clave].txt.ts`, que deriva su nombre de la constante y por eso no puede
 * quedarse desincronizada; y que el aviso salga **después** de desplegar lo sostiene el
 * `needs: desplegar` del flujo de trabajo, no una prueba.
 */

const SITIO = 'https://sabiduriadebolsillo.net';

describe('la clave', () => {
  it('es hexadecimal y de la longitud que el protocolo admite', () => {
    // Entre 8 y 128 caracteres de [a-f0-9]. Una clave con un guion se rechaza al enviar,
    // y el rechazo llega días después en forma de nada.
    expect(CLAVE_DE_INDEXNOW).toMatch(/^[a-f0-9]{8,128}$/);
  });

  it('nombra el fichero que la sirve, para que no haya dos verdades', () => {
    expect(RUTA_DE_LA_CLAVE).toBe(`/${CLAVE_DE_INDEXNOW}.txt`);
  });

  it('avisa al punto común y no solo a Bing', () => {
    // `bing.com/indexnow` funcionaría y dejaría fuera a Yandex, Naver y Seznam.
    expect(PUNTO_DE_INDEXNOW).toContain('api.indexnow.org');
  });
});

describe('el slug de una Cita no es el nombre de su fichero', () => {
  /*
   * Esta es la prueba de un fallo que se cometió y se corrigió: `tools/avisar.ts` derivaba
   * el slug del nombre del fichero, y componía `/cita/…prada--los-que…` con dos guiones
   * donde la URL publicada lleva uno. El aviso salía verde anunciando 404.
   *
   * Se comprueba contra el corpus de verdad, no contra un ejemplo inventado: lo que hay
   * que impedir es que alguien vuelva a dar por hecho que coinciden.
   */
  const CITAS = resolve(import.meta.dirname, '../../corpus/citas');

  it('difieren en el corpus publicado, así que no se pueden confundir', () => {
    const ficheros = readdirSync(CITAS).filter((f) => f.endsWith('.md'));
    expect(ficheros.length).toBeGreaterThan(0);

    const iguales: string[] = [];
    for (const fichero of ficheros) {
      const slug = /^slug:\s*"?([^"\n]+)"?/m.exec(readFileSync(join(CITAS, fichero), 'utf8'));
      if (slug === null) continue;
      if (slug[1]?.trim() === basename(fichero, '.md')) iguales.push(fichero);
    }

    expect(iguales).toEqual([]);
  });
});

describe('el cuerpo del aviso', () => {
  it('compone host, clave y dónde encontrarla', () => {
    const aviso = avisoDeIndexNow(SITIO, ['/']);

    expect(aviso).toMatchObject({
      host: 'sabiduriadebolsillo.net',
      key: CLAVE_DE_INDEXNOW,
      keyLocation: `${SITIO}${RUTA_DE_LA_CLAVE}`,
    });
    expect(aviso.urlList).toEqual([`${SITIO}/`]);
  });

  it('convierte rutas relativas en absolutas del origen', () => {
    const aviso = avisoDeIndexNow(SITIO, ['/cita/seneca-la-vida', '/autor/seneca']);

    expect(aviso.urlList).toEqual([
      `${SITIO}/cita/seneca-la-vida`,
      `${SITIO}/autor/seneca`,
    ]);
  });

  it('acepta una URL absoluta ya compuesta sin duplicarla', () => {
    const aviso = avisoDeIndexNow(SITIO, ['/autor/seneca', `${SITIO}/autor/seneca`]);
    expect(aviso.urlList).toEqual([`${SITIO}/autor/seneca`]);
  });

  it('descarta lo que sea de otro dominio', () => {
    /*
     * El protocolo rechaza el aviso **entero** si una sola URL no es del host declarado,
     * así que colar una de fuera perdería también las buenas. Se descarta y las demás
     * salen.
     */
    const aviso = avisoDeIndexNow(SITIO, ['/', 'https://sabiduriadebolsillo.com/lander']);
    expect(aviso.urlList).toEqual([`${SITIO}/`]);
  });

  it('descarta lo que no se puede interpretar como URL', () => {
    const aviso = avisoDeIndexNow(SITIO, ['/', 'http://[esto no va']);
    expect(aviso.urlList).toEqual([`${SITIO}/`]);
  });

  it('no pasa del tope que el protocolo admite', () => {
    const muchas = Array.from({ length: TOPE_POR_AVISO + 500 }, (_, i) => `/cita/n-${i}`);
    expect(avisoDeIndexNow(SITIO, muchas).urlList).toHaveLength(TOPE_POR_AVISO);
  });

  it('respeta un origen de previsualización, no solo el dominio de producción', () => {
    // `SITE_URL` manda cuando trae algo (LC-1); el aviso tiene que ir a ese mismo origen.
    const aviso = avisoDeIndexNow('https://ensayo.example/', ['/']);
    expect(aviso.host).toBe('ensayo.example');
    expect(aviso.keyLocation).toBe(`https://ensayo.example${RUTA_DE_LA_CLAVE}`);
  });
});

describe('las cuatro familias del Corpus', () => {
  const citas = [
    { slug: 'seneca-la-vida', autor: 'seneca', temas: ['el-tiempo'] },
    { slug: 'unamuno-la-libertad', autor: 'miguel-de-unamuno', temas: ['la-libertad'] },
  ];
  const colecciones = [
    { slug: 'para-vivir-despacio', miembros: ['seneca-la-vida'] },
  ];

  it('comparte una sola declaración entre el filtro de git y el reconocimiento', () => {
    expect(DIRECTORIOS_AVISABLES).toEqual([
      ['corpus/citas', 'cita'],
      ['corpus/autores', 'autor'],
      ['corpus/temas', 'tema'],
      ['corpus/colecciones', 'coleccion'],
    ]);
    for (const [directorio, familia] of DIRECTORIOS_AVISABLES) {
      expect(familiaDeFichero(`${directorio}/ejemplo.md`)).toBe(familia);
    }
    expect(familiaDeFichero('corpus/indexacion.yml')).toBeUndefined();
    expect(familiaDeFichero('corpus/sesiones-de-sembrado.yml')).toBeUndefined();
  });

  it('no avisa nada cuando el empujón solo toca metadato de indexación', () => {
    expect(rutasAfectadas([], citas, colecciones)).toEqual([]);
  });

  it('una Cita avisa su forma anterior y nueva y las agregaciones afectadas', () => {
    const rutas = rutasAfectadas(
      [{
        familia: 'cita',
        slug: 'seneca-la-vida',
        citaAntes: { slug: 'seneca-la-vida', autor: 'seneca', temas: ['el-tiempo'] },
        citaDespues: {
          slug: 'seneca-la-vida',
          autor: 'miguel-de-unamuno',
          temas: ['la-libertad'],
        },
      }],
      citas,
      colecciones,
    );

    expect(rutas).toEqual(expect.arrayContaining([
      '/',
      '/cita/seneca-la-vida/',
      '/autor/seneca/',
      '/autor/miguel-de-unamuno/',
      '/tema/el-tiempo/',
      '/tema/la-libertad/',
      '/coleccion/para-vivir-despacio/',
    ]));
  });

  it('un Autor avisa todas las superficies donde se reproduce su nombre', () => {
    const rutas = rutasAfectadas(
      [{ familia: 'autor', slug: 'seneca' }],
      citas,
      colecciones,
    );

    expect(rutas).toEqual(expect.arrayContaining([
      '/',
      '/autor/seneca/',
      '/cita/seneca-la-vida/',
      '/tema/el-tiempo/',
      '/coleccion/para-vivir-despacio/',
    ]));
  });

  it('un Tema avisa su listado y las Citas cuyos chips cambian', () => {
    expect(rutasAfectadas(
      [{ familia: 'tema', slug: 'la-libertad' }],
      citas,
      colecciones,
    )).toEqual(expect.arrayContaining([
      '/',
      '/tema/la-libertad/',
      '/cita/unamuno-la-libertad/',
    ]));
  });

  it('una Colección avisa su página y la portada que la enumera', () => {
    expect(rutasAfectadas(
      [{ familia: 'coleccion', slug: 'para-vivir-despacio' }],
      citas,
      colecciones,
    )).toEqual(['/', '/coleccion/para-vivir-despacio/']);
  });
});
