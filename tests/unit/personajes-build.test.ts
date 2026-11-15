import { afterAll, describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import {
  ATESTIGUADA,
  AUTOR_VALIDO,
  TEMA_VALIDO,
  citaValida,
  conLaPuertaAbierta,
  construirConCorpus,
  limpiar,
  paginaConstruida,
} from './ayuda/construir.js';
import { ORDEN_PROPONER_CLAVES_DE_PERSONAJE } from '../../tools/lib/claves.ts';
import { componerBiografia, nombreDeBiografia } from '../../tools/lib/documento.ts';

/**
 * Historia 35.2 — el Personaje y la Obra de un solo dueño, como puertas del build.
 *
 * Lo puro está en `personaje.test.ts`, `obras.test.ts` y `autoria.test.ts`; aquí, sobre proyectos
 * construidos de verdad. Astro corre las puertas una tras otra y se para en la primera que rompe
 * —y el esquema, antes que ninguna—, así que cada puerta tiene su construcción, con **todos** sus
 * fallos en una sola pasada, y una feliz: un Personaje sin Citas, una Cita (Autor y Personaje) en
 * la ficha de su Autor y una ficha de Personaje sin Citas publicadas, que avisa como hoy.
 */

const aLimpiar: string[] = [];
afterAll(async () => {
  await Promise.all(aLimpiar.map(limpiar));
});

const personaje = (nombre: string, clave?: string) =>
  `nombre: "${nombre}"\nuniverso: "DC Comics"\n${clave === undefined ? '' : `ordenAlfabetico: "${clave}"\n`}`;

/** Una atribuida de un Personaje, con Fuente y obra para que el cotejo la sitúe como cualquiera. */
const atribuida = (slug: string, texto: string, dueños: { autor?: string; personaje: string }, obra = 'Obras de seneca') =>
  citaValida({
    texto,
    slug,
    autor: dueños.autor,
    personaje: dueños.personaje,
    clase: 'atribuida',
    estadoDerechos: undefined,
    ...ATESTIGUADA,
    procedencia: { obra, año: 2000 },
    fuente: { id: 'wikisource-es', url: `https://es.wikisource.org/wiki/${encodeURIComponent(obra)}` },
  });

/** Historia 35.1b — la puerta de la atribuida, abierta en la copia: aquí se mide el Personaje. */
const PUERTA = { ficheros: conLaPuertaAbierta() };

const BASE = {
  'autores/seneca.yml': AUTOR_VALIDO,
  'temas/el-tiempo.yml': TEMA_VALIDO,
  'citas/seneca--no-es-que-tengamos-poco-tiempo.md': citaValida(),
};

const fichaDePersonaje = (dueño: string, personajes: string[], titulo: string, forma: string, autor?: string) =>
  `${autor === undefined ? '' : `autor: "${autor}"\n`}personaje: "${dueño}"\npersonajes:\n${personajes
    .map((p) => `  - "${p}"\n`)
    .join('')}titulo: "${titulo}"\nformas:\n  - "${forma}"\n`;

describe('Historia 35.2 — el Personaje en el build', () => {
  it('feliz: Personaje sin Citas, Cita (Autor y Personaje) en la ficha de su Autor, ficha de Personaje sin Citas', async () => {
    const r = await construirConCorpus({
      ...BASE,
      'personajes/batman.yml': personaje('Batman', 'Batman'),
      'personajes/joker.yml': personaje('Joker'),
      // El Autor se supo después: el slug, que es la URL, sigue siendo el del Personaje.
      'citas/batman--la-noche-es-mas-oscura.md': atribuida(
        'batman-la-noche-es-mas-oscura',
        'La noche es más oscura justo antes del amanecer.',
        { autor: 'seneca', personaje: 'batman' },
      ),
      'obras/batman--el-caballero.yml': fichaDePersonaje('batman', ['batman', 'joker'], 'El caballero', 'el caballero'),
    }, PUERTA);
    aLimpiar.push(r.proyecto);
    expect(r.codigo, r.salida).toBe(0);
    expect(r.salida).toContain('batman--el-caballero.yml → ninguna Cita publicada resuelve esta ficha');
    // La Cita se publica en su ruta de siempre, en la ficha de su Autor.
    expect(existsSync(paginaConstruida(r.proyecto, '/cita/batman-la-noche-es-mas-oscura/'))).toBe(true);
    expect(existsSync(paginaConstruida(r.proyecto, '/obra/seneca/obras-de-seneca/'))).toBe(true);
    // No hay página de la ficha sin Citas.
    expect(existsSync(paginaConstruida(r.proyecto, '/obra/batman/el-caballero/'))).toBe(false);
    // Historia 35.3 — el Personaje con Citas tiene página, y la Atribución lo nombra y enlaza a
    // ella; el que no tiene Citas, ni página ni mención. El universo solo lo dice su página.
    expect(existsSync(paginaConstruida(r.proyecto, '/personaje/batman/'))).toBe(true);
    expect(existsSync(paginaConstruida(r.proyecto, '/personaje/joker/'))).toBe(false);
    const pagina = readFileSync(paginaConstruida(r.proyecto, '/cita/batman-la-noche-es-mas-oscura/'), 'utf8');
    expect(pagina).toMatch(/<a href="\/personaje\/batman\/" class="enlace-en-tinta"[^>]*>Batman<\/a>/u);
    expect(pagina).not.toMatch(/joker/iu);
    expect(pagina).not.toContain('DC Comics');
    // Historia 35.4 — el Personaje va donde va el Autor: también en lo copiado y en el JSON-LD.
    expect(pagina).toContain('— Batman, Obras de seneca, de Séneca, 2000.');
    expect(pagina).toContain('"spokenByCharacter":{"@type":"Person","name":"Batman"');
  });

  it('la puerta de los Personajes: slug de un Autor activo o retirado, y la Cita de un Personaje que no existe', async () => {
    const r = await construirConCorpus({
      ...BASE,
      'personajes/seneca.yml': personaje('Séneca'),
      '_autores-retirados/lucrecio.yml': 'nombre: "Lucrecio"\nañoFallecimiento: -55\nsemblanza: "Poeta."\n',
      'personajes/lucrecio.yml': personaje('Lucrecio'),
      'citas/seneca--por-que-tan-serio.md': atribuida('seneca-por-que-tan-serio', 'Por qué tan serio.', {
        autor: 'seneca',
        personaje: 'joker',
      }),
    }, PUERTA);
    aLimpiar.push(r.proyecto);
    expect(r.codigo).not.toBe(0);
    expect(r.salida).toMatch(/corpus\/personajes\/seneca\.yml: .*corpus\/autores\/seneca\.yml/u);
    expect(r.salida).toMatch(/corpus\/personajes\/lucrecio\.yml: .*corpus\/_autores-retirados\/lucrecio\.yml/u);
    expect(r.salida).toMatch(/corpus\/citas\/seneca--por-que-tan-serio\.md: .*«joker»/u);
    expect(r.salida).toContain('Personajes: 3 incumplimientos');
  });

  it('la clave: un Personaje con Cita publicada y sin clave rompe nombrando su fichero y la orden', async () => {
    const r = await construirConCorpus({
      ...BASE,
      'personajes/batman.yml': personaje('Batman'),
      'citas/seneca--la-noche.md': atribuida('seneca-la-noche', 'La noche es larga.', { autor: 'seneca', personaje: 'batman' }),
    }, PUERTA);
    aLimpiar.push(r.proyecto);
    expect(r.codigo).not.toBe(0);
    expect(r.salida).toMatch(/corpus\/personajes\/batman\.yml: el Personaje tiene Citas publicadas y no tiene clave/u);
    expect(r.salida).toContain(ORDEN_PROPONER_CLAVES_DE_PERSONAJE);
  });

  it('las fichas: ambigua y misma forma entre fichas de Personaje', async () => {
    const r = await construirConCorpus(
      {
        ...BASE,
        'obras/seneca--sobre-la-brevedad-de-la-vida.yml':
          'autor: "seneca"\ntitulo: "Sobre la brevedad de la vida"\nformas:\n  - "sobre la brevedad de la vida"\n',
        'personajes/batman.yml': personaje('Batman', 'Batman'),
        'personajes/joker.yml': personaje('Joker', 'Joker'),
        'personajes/robin.yml': personaje('Robin', 'Robin'),
        // Ambigua: la ficha de Séneca y la de Batman con Séneca informativo, en el mismo paso.
        'obras/seneca--la-noche.yml': 'autor: "seneca"\ntitulo: "La noche"\nformas:\n  - "la noche"\n',
        'obras/batman--la-noche.yml': fichaDePersonaje('batman', ['batman'], 'La noche', 'la noche', 'seneca'),
        'citas/seneca--la-noche-es-larga.md': atribuida(
          'seneca-la-noche-es-larga',
          'La noche es larga.',
          { autor: 'seneca', personaje: 'batman' },
          'La noche',
        ),
        // Desde la Historia 35.4, una ficha de Personaje con Citas publicadas ya no rompe: la
        // pinta su Página de Obra (`personaje-donde-el-autor.test.ts`).
        // La misma forma en dos fichas de Personaje.
        'obras/batman--la-cueva.yml': fichaDePersonaje('batman', ['batman'], 'La cueva', 'la cueva'),
        'obras/robin--la-cueva.yml': fichaDePersonaje('robin', ['robin'], 'La cueva', 'la cueva'),
      },
      { sembrarObras: false, ...PUERTA },
    );
    aLimpiar.push(r.proyecto);
    expect(r.codigo).not.toBe(0);
    expect(r.salida).toMatch(
      /corpus\/citas\/seneca--la-noche-es-larga\.md → su obra la reclaman 2 fichas: corpus\/obras\/batman--la-noche\.yml, corpus\/obras\/seneca--la-noche\.yml/u,
    );
    expect(r.salida).toMatch(/«la cueva» la reclaman 2 fichas de Personaje: corpus\/obras\/batman--la-cueva\.yml, corpus\/obras\/robin--la-cueva\.yml/u);
  });

  it('la semblanza por AD-26 de un Personaje se coteja literal contra su biografía, como la del Autor', async () => {
    const cabecera = {
      fuente: 'wikipedia-es',
      titulo: 'Batman',
      revision: 123,
      fechaDeRevision: '2024-05-01',
      licencia: 'CC BY-SA 4.0',
      url: 'https://es.wikipedia.org/w/index.php?title=Batman&oldid=123',
      recuperado: '2026-10-10',
    } as const;
    const documento = nombreDeBiografia(cabecera.fuente, cabecera.titulo, cabecera.revision);
    const r = await construirConCorpus({
      ...BASE,
      [`biografias/${documento}.txt`]: componerBiografia(
        cabecera,
        'Batman',
        'Batman es un personaje de cómic creado por Bob Kane y Bill Finger en 1939.',
      ),
      'personajes/batman.yml':
        `${personaje('Batman', 'Batman')}semblanza: "Batman es un justiciero inventado que esta revisión no dice."
` +
        `biografia:
  documento: "${documento}"
  revision: 123
`,
    }, PUERTA);
    aLimpiar.push(r.proyecto);
    expect(r.codigo).not.toBe(0);
    expect(r.salida).toContain('corpus/personajes/batman.yml');
    expect(r.salida).toMatch(/el Personaje declara la biografía [^\n]*su semblanza no aparece literal/u);
  });

  // Historia 35.4 — la Cita publicada sin Autor ya no rompe el esquema: la construye, con su Obra
  // de Personaje y alcanzable desde la portada, `personaje-donde-el-autor.test.ts`.
});
