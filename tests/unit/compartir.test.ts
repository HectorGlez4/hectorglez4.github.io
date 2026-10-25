import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  CONSTRUCTORES,
  DESTINOS_OFRECIDOS,
  textoParaCompartir,
} from '../../src/lib/compartir.ts';
import { DESTINOS_DE_ENLACE, DESTINO_DE_IMAGEN, DESTINO_OPACO } from '../../src/lib/destinos.ts';
import { procedenciaCompuesta, textoParaCopiar } from '../../src/lib/atribucion.ts';
import { citaEnPieza } from '../../src/lib/pieza.ts';
import type { Cita, Autor } from '../../src/lib/publicado.ts';
import { colgarObras, type FichaDeObra } from '../../src/lib/obras.ts';

const raiz = resolve(import.meta.dirname, '../..');

/** Historia 10.3 — compartir el enlace a un destino. */

/**
 * Historia 22.3 — una Cita del sitio llega con su Obra resuelta colgada, que es de donde las
 * superficies sacan el título. Los fixtures se cuelgan igual, con su ficha.
 */
function conObra(cita: Cita, ficha: Omit<FichaDeObra, 'ruta'>): Cita {
  return colgarObras([cita], [{ ...ficha, ruta: `corpus/obras/${ficha.nombre}.yml` }])[0];
}

const CITA = conObra(
  {
    slug: 'seneca-una',
    texto: 'No es que tengamos poco tiempo, es que perdemos mucho.',
    autor: 'seneca',
    temas: [],
    procedencia: { obra: 'Sobre la brevedad de la vida', año: 49 },
  } as unknown as Cita,
  {
    nombre: 'seneca--sobre-la-brevedad-de-la-vida',
    autor: 'seneca',
    titulo: 'Sobre la brevedad de la vida',
    formas: ['sobre la brevedad de la vida'],
  },
);

const AUTOR = { slug: 'seneca', nombre: 'Séneca' } as unknown as Autor;
const URL_CITA = 'https://sabiduriadebolsillo.net/cita/seneca-una';

describe('Historia 10.3 — el texto propuesto', () => {
  const texto = textoParaCompartir(CITA, AUTOR);

  it('incluye la Cita y el nombre del Autor', () => {
    expect(texto).toContain(CITA.texto);
    expect(texto).toContain(AUTOR.nombre);
  });

  it('nunca es solo la dirección', () => {
    expect(texto).not.toBe(URL_CITA);
    expect(texto.length).toBeGreaterThan(URL_CITA.length);
  });

  it('es exactamente el mismo que se copia y el que lleva la Imagen', () => {
    // Tres atribuciones distintas de la misma Cita no se ven hasta compararlas juntas.
    expect(texto).toBe(textoParaCopiar(CITA, AUTOR));
  });
});

/** Todos los constructores, los que se ofrecen y los que esperan a la Historia 25.1. */
const DESTINOS = Object.values(CONSTRUCTORES);

describe('Historia 10.3 — los destinos', () => {
  it('cada uno lleva el texto y el enlace dentro, salvo Facebook, que solo admite el enlace', () => {
    for (const destino of DESTINOS.filter((d) => d.id !== 'facebook')) {
      const enlace = destino.enlace(textoParaCompartir(CITA, AUTOR), URL_CITA);
      expect(enlace, destino.id).toContain(encodeURIComponent(AUTOR.nombre));
      expect(decodeURIComponent(enlace), destino.id).toContain(URL_CITA);
    }
  });

  it('todos son direcciones que abre el navegador, sin instalar nada', () => {
    for (const destino of DESTINOS) {
      const enlace = destino.enlace('texto', URL_CITA);
      expect(enlace, destino.id).toMatch(/^(https:\/\/|mailto:)/);
      // Ni esquemas de aplicación nativa, que exigen tenerla instalada.
      expect(enlace).not.toMatch(/^(intent:|whatsapp:|tg:|fb:)/);
    }
  });

  it('no está ninguna que no admita recibir un enlace desde la web', () => {
    /*
     * Instagram y TikTok no aceptan enlace preinsertado desde un navegador. Ofrecerlas
     * obligaría a pedir que se instale la aplicación o a abrir una página que no hace
     * nada con lo que se le manda. Para esas dos el camino es la Imagen y la hoja del
     * sistema de FR-17.
     */
    const ids = DESTINOS.map((d) => d.id);
    expect(ids).not.toContain('instagram');
    expect(ids).not.toContain('tiktok');
  });

  it('el texto va escapado: una Cita con signos no rompe la dirección', () => {
    const conSignos = { ...CITA, texto: '¿Y ahora qué? Todo & nada #así' } as unknown as Cita;
    // Facebook no lleva el texto (abajo, Historia 23.2): su enlace va escapado igual.
    for (const destino of DESTINOS.filter((d) => d.id !== 'facebook')) {
      const enlace = destino.enlace(textoParaCompartir(conSignos, AUTOR), URL_CITA);
      // Sin escapar, el `#` cortaría la dirección y el `&` inventaría un parámetro.
      expect(enlace, destino.id).not.toContain('#así');
      expect(decodeURIComponent(enlace), destino.id).toContain('¿Y ahora qué?');
    }
  });

  it('cada destino tiene identificador propio: la medición los distingue', () => {
    expect(new Set(DESTINOS.map((d) => d.id)).size).toBe(DESTINOS.length);
  });
});

describe('Historia 23.2 — un constructor por destino de enlace, y se ofrecen los de siempre', () => {
  it('las claves de CONSTRUCTORES son los destinos de enlace, y cada una construye el suyo', () => {
    expect(Object.keys(CONSTRUCTORES)).toEqual([...DESTINOS_DE_ENLACE]);
    for (const [id, destino] of Object.entries(CONSTRUCTORES)) expect(destino.id).toBe(id);
  });

  it('ninguno para la Historia de Instagram ni para la hoja del sistema', () => {
    expect(CONSTRUCTORES).not.toHaveProperty(DESTINO_DE_IMAGEN);
    expect(CONSTRUCTORES).not.toHaveProperty(DESTINO_OPACO);
  });

  it('los ofrecidos son los cuatro de hoy, en su orden, y salen de CONSTRUCTORES', () => {
    expect(DESTINOS_OFRECIDOS.map((d) => d.id)).toEqual(['whatsapp', 'telegram', 'x', 'correo']);
    for (const destino of DESTINOS_OFRECIDOS) expect(destino).toBe(CONSTRUCTORES[destino.id]);
  });

  it('Facebook lleva el enlace y no el texto: su diálogo no admite otro', () => {
    const enlace = CONSTRUCTORES.facebook.enlace(textoParaCompartir(CITA, AUTOR), URL_CITA);
    expect(enlace).toBe(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(URL_CITA)}`);
    expect(decodeURIComponent(enlace)).not.toContain(AUTOR.nombre);
  });

  it('Threads lleva el texto y el enlace, cada uno en su parámetro y escapado', () => {
    const texto = '¿Y ahora qué? Todo & nada #así';
    const enlace = CONSTRUCTORES.threads.enlace(texto, URL_CITA);
    expect(enlace).toBe(
      `https://www.threads.com/intent/post?text=${encodeURIComponent(texto)}&url=${encodeURIComponent(URL_CITA)}`,
    );
    const parametros = new URL(enlace).searchParams;
    expect(parametros.get('text')).toBe(texto);
    expect(parametros.get('url')).toBe(URL_CITA);
  });
});

describe('Historia 10.3 — la isla no construye direcciones en el cliente', () => {
  const isla = readFileSync(resolve(raiz, 'src/islands/CompartirEnlace.astro'), 'utf8');
  const guion = isla.slice(isla.indexOf('<script'), isla.indexOf('</script>'));

  it('los destinos se componen en el build, no al pulsar', () => {
    expect(guion).not.toContain('encodeURIComponent');
    expect(guion).not.toContain('wa.me');
  });

  it('comprueba compartir en general, no compartir ficheros', () => {
    // Es la capacidad contraria a la de FR-17, y a propósito: aquí se manda texto y
    // enlace, que es justo lo que sabe hacer el navegador que no admite ficheros.
    expect(guion).toContain('navigator.share');
    expect(guion).not.toContain('canShare');
  });
});

describe('Historia 19.1 — lo copiado nombra la traducción', () => {
  const ODAS = { nombre: 'horacio--odas', autor: 'horacio', titulo: 'Odas', formas: ['odas'] };
  const ODA = conObra(
    {
      slug: 'horacio-una',
      texto: 'Feliz quien lejos de negocios vive.',
      autor: 'horacio',
      temas: [],
      procedencia: { obra: 'Odas', traduccion: { traductor: 'Germán Salinas', año: 1909 } },
    } as unknown as Cita,
    ODAS,
  );
  const HORACIO = { slug: 'horacio', nombre: 'Horacio' } as unknown as Autor;

  it('«… — Horacio, Odas, trad. de Germán Salinas, 1909.»', () => {
    expect(textoParaCopiar(ODA, HORACIO)).toBe(
      '«Feliz quien lejos de negocios vive.» — Horacio, Odas, trad. de Germán Salinas, 1909.',
    );
  });

  it('con el año de la Cita y traducción sin año', () => {
    const cita = conObra(
      {
        ...ODA,
        procedencia: { obra: 'Odas', año: -23, traduccion: { traductor: 'Wikisource' } },
      } as unknown as Cita,
      ODAS,
    );
    expect(textoParaCopiar(cita, HORACIO)).toBe(
      '«Feliz quien lejos de negocios vive.» — Horacio, Odas, -23, trad. de Wikisource.',
    );
  });

  it('procedenciaCompuesta, que es lo que rasterizan la Imagen y la Pieza, no la nombra', () => {
    expect(procedenciaCompuesta(ODA)).toBe('Odas');
    expect(citaEnPieza(ODA, HORACIO)).toEqual({
      texto: 'Feliz quien lejos de negocios vive.',
      autor: 'Horacio',
      procedencia: 'Odas',
    });
  });
});
