import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DESTINOS, textoParaCompartir } from '../../src/lib/compartir.ts';
import { textoParaCopiar } from '../../src/lib/atribucion.ts';
import type { Cita, Autor } from '../../src/lib/publicado.ts';

const raiz = resolve(import.meta.dirname, '../..');

/** Historia 10.3 — compartir el enlace a un destino. */

const CITA = {
  slug: 'seneca-una',
  texto: 'No es que tengamos poco tiempo, es que perdemos mucho.',
  autor: 'seneca',
  temas: [],
  procedencia: { obra: 'Sobre la brevedad de la vida', año: 49 },
} as unknown as Cita;

const AUTOR = { slug: 'seneca', nombre: 'Séneca' } as unknown as Autor;
const URL_CITA = 'https://sabiduriadebolsillo.com/cita/seneca-una';

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

describe('Historia 10.3 — los destinos', () => {
  it('cada uno lleva el texto y el enlace dentro', () => {
    for (const destino of DESTINOS) {
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
    for (const destino of DESTINOS) {
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
