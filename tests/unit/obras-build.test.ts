import { afterAll, describe, expect, it } from 'vitest';
import {
  AUTOR_VALIDO,
  TEMA_VALIDO,
  citaValida,
  construirConCorpus,
  limpiar,
} from './ayuda/construir.js';
import { componerDocumento } from '../../tools/lib/documento.ts';

/**
 * Historia 22.1 — la puerta de las Fichas de Obra sobre un proyecto construido de verdad.
 *
 * Lo puro está en `obras.test.ts`; aquí se comprueba que la regla **es puerta**: que una
 * Obra sin ficha, una forma reclamada dos veces o un prefijo que no casa rompen `astro
 * build`, y que una ficha sin Citas solo avisa.
 */

const aLimpiar: string[] = [];
afterAll(async () => {
  await Promise.all(aLimpiar.map(limpiar));
});

const BASE = {
  'autores/seneca.yml': AUTOR_VALIDO,
  'autores/horacio.yml':
    'nombre: Horacio\nañoFallecimiento: -8\nsemblanza: Poeta latino.\n',
  'temas/el-tiempo.yml': TEMA_VALIDO,
  'citas/seneca--no-es-que-tengamos-poco-tiempo.md': citaValida(),
};

const FICHA_BUENA =
  'autor: "seneca"\ntitulo: "Sobre la brevedad de la vida"\nformas:\n  - "sobre la brevedad de la vida"\n';

describe('Historia 22.1 — toda Obra publicada tiene ficha', () => {
  it('una Obra sin ficha rompe el build nombrando Obra, Autor y orden', async () => {
    const r = await construirConCorpus(BASE, { sembrarObras: false });
    aLimpiar.push(r.proyecto);
    expect(r.codigo).not.toBe(0);
    expect(r.salida).toContain('Sobre la brevedad de la vida');
    expect(r.salida).toContain('seneca');
    expect(r.salida).toContain('npm run obra -- sembrar');
  });

  it('con la ficha sembrada, construye', async () => {
    const r = await construirConCorpus(BASE);
    aLimpiar.push(r.proyecto);
    expect(r.codigo, r.salida).toBe(0);
  });

  it('una forma reclamada por dos fichas rompe nombrando las dos', async () => {
    const r = await construirConCorpus({
      ...BASE,
      'obras/seneca--sobre-la-brevedad-de-la-vida.yml': FICHA_BUENA,
      'obras/seneca--de-la-brevedad-de-la-vida.yml': FICHA_BUENA.replace(
        'titulo: "Sobre',
        'titulo: "De',
      ),
    });
    aLimpiar.push(r.proyecto);
    expect(r.codigo).not.toBe(0);
    expect(r.salida).toContain('seneca--sobre-la-brevedad-de-la-vida.yml');
    expect(r.salida).toContain('seneca--de-la-brevedad-de-la-vida.yml');
  });

  it('un nombre cuyo prefijo no es su Autor rompe', async () => {
    const r = await construirConCorpus({
      ...BASE,
      'obras/seneca--x.yml': 'autor: "horacio"\ntitulo: "X"\nformas:\n  - "x"\n',
    });
    aLimpiar.push(r.proyecto);
    expect(r.codigo).not.toBe(0);
    expect(r.salida).toContain('seneca--x.yml');
  });

  it('una ficha cuyo Autor no existe rompe', async () => {
    const r = await construirConCorpus({
      ...BASE,
      'obras/ovidio--metamorfosis.yml':
        'autor: "ovidio"\ntitulo: "Metamorfosis"\nformas:\n  - "metamorfosis"\n',
    });
    aLimpiar.push(r.proyecto);
    expect(r.codigo).not.toBe(0);
    expect(r.salida).toContain('ovidio--metamorfosis.yml');
    expect(r.salida).toContain('no existe');
  });

  it('un nombre sin forma de slug rompe', async () => {
    const r = await construirConCorpus({
      ...BASE,
      'obras/seneca--De_la_ira.yml': 'autor: "seneca"\ntitulo: "De la ira"\nformas:\n  - "de la ira"\n',
    });
    aLimpiar.push(r.proyecto);
    expect(r.codigo).not.toBe(0);
    expect(r.salida).toContain('seneca--De_la_ira');
  });

  it('dos fichas con el mismo nombre (.yml y .yaml) rompen', async () => {
    const r = await construirConCorpus({
      ...BASE,
      'obras/seneca--de-la-ira.yml': 'autor: "seneca"\ntitulo: "De la ira"\nformas:\n  - "de la ira"\n',
      'obras/seneca--de-la-ira.yaml': 'autor: "seneca"\ntitulo: "De la ira"\nformas:\n  - "sobre la ira"\n',
    });
    aLimpiar.push(r.proyecto);
    expect(r.codigo).not.toBe(0);
    expect(r.salida).toContain('seneca--de-la-ira.yaml');
  });

  it('una ficha sin Citas avisa y el build pasa', async () => {
    const r = await construirConCorpus({
      ...BASE,
      'obras/seneca--de-la-ira.yml': 'autor: "seneca"\ntitulo: "De la ira"\nformas:\n  - "de la ira"\n',
    });
    aLimpiar.push(r.proyecto);
    expect(r.codigo, r.salida).toBe(0);
    expect(r.salida).toContain('seneca--de-la-ira.yml');
    expect(r.salida).toContain('ninguna Cita publicada');
  });
});

/*
 * Historia 22.2 — la puerta ortográfica. La Cita sin documento es la de Sor Juana que de
 * verdad está en el censo de partida, con su texto: el cotejo la ampara y lo que se mide es
 * la puerta de las Obras, no la del cotejo.
 */
describe('Historia 22.2 — una obra, un nombre', () => {
  const SOR = 'sor-juana-ines-de-la-cruz';
  const CENSADA = `${SOR}-yo-no-estudio-para-saber-mas-sino`;
  const URL = 'https://es.wikisource.org/wiki/Respuesta_a_sor_Filotea_de_la_Cruz';

  const documento = (obra: string, texto: string) =>
    componerDocumento(
      { fuente: 'wikisource-es', obra, url: URL, recuperado: '2026-08-21' },
      // Firmado por la Autora: sin eso la puerta no sugeriría restituir-grafia.
      `${obra}\n|autor=Sor Juana Inés de la Cruz`,
      texto,
    );

  const BASE_SOR = {
    [`autores/${SOR}.yml`]:
      'nombre: Sor Juana Inés de la Cruz\nañoFallecimiento: 1695\nsemblanza: Poeta novohispana.\n',
    'temas/el-tiempo.yml': TEMA_VALIDO,
    'pendientes-de-cotejo.yml': `citas:\n  - ${CENSADA}\n`,
    [`citas/${SOR}--yo-no-estudio-para-saber-mas-sino.md`]: citaValida({
      autor: SOR,
      slug: CENSADA,
      texto: 'Yo no estudio para saber más, sino para ignorar menos.',
      procedencia: { obra: 'Respuesta a sor Filotea de la Cruz', año: 1691 },
      fuente: undefined,
    }),
  };

  it('dos grafías, una de una Cita sin documento: rompe y da la orden', async () => {
    const r = await construirConCorpus({
      ...BASE_SOR,
      [`citas/${SOR}--bien-dijo-lupercio.md`]: citaValida({
        autor: SOR,
        slug: `${SOR}-bien-dijo-lupercio`,
        texto: 'Bien se puede filosofar y aderezar la cena.',
        procedencia: { obra: 'Respuesta a Sor Filotea de la Cruz' },
        fuente: { id: 'wikisource-es', url: URL },
      }),
      'fuentes/wikisource-es--respuesta-a-sor-filotea-de-la-cruz.txt': documento(
        'Respuesta a Sor Filotea de la Cruz',
        'Bien se puede filosofar y aderezar la cena.',
      ),
    });
    aLimpiar.push(r.proyecto);
    expect(r.codigo).not.toBe(0);
    expect(r.salida).toContain(`corpus/citas/${SOR}--yo-no-estudio-para-saber-mas-sino.md`);
    expect(r.salida).toContain('«Respuesta a sor Filotea de la Cruz» ×1');
    expect(r.salida).toContain('«Respuesta a Sor Filotea de la Cruz» ×1');
    expect(r.salida).toContain(`npm run obra -- restituir-grafia ${CENSADA}`);
  });

  it('una sola grafía sin documento construye; los prefijos avisan y distintaDe los calla', async () => {
    const r = await construirConCorpus({
      ...BASE_SOR,
      'obras/sor-juana-ines-de-la-cruz--respuesta-a-sor-filotea.yml':
        `autor: "${SOR}"\ntitulo: "Respuesta a sor Filotea"\nformas:\n  - "respuesta a sor filotea"\n`,
      'obras/sor-juana-ines-de-la-cruz--sonetos.yml':
        `autor: "${SOR}"\ntitulo: "Sonetos"\nformas:\n  - "sonetos"\n`,
      'obras/sor-juana-ines-de-la-cruz--sonetos-i.yml':
        `autor: "${SOR}"\ntitulo: "Sonetos I"\nformas:\n  - "sonetos i"\ndistintaDe:\n  - "sonetos"\n`,
    });
    aLimpiar.push(r.proyecto);
    expect(r.codigo, r.salida).toBe(0);
    // «respuesta a sor filotea» es prefijo de la forma publicada y nadie lo ha decidido.
    expect(r.salida).toContain('es prefijo de «respuesta a sor filotea de la cruz»');
    // «sonetos» y «sonetos i» están declaradas distintas.
    expect(r.salida).not.toContain('«sonetos» (corpus/obras/');
  });

  /*
   * Los dos documentos y las dos Fuentes se escriben aquí, a la vista: así la prueba no
   * depende de que el andamio siembre cabeceras iguales a las Citas, y la gemela de abajo
   * —con una cabecera que no es la grafía de su Cita— comprueba que la puerta sí mira.
   */
  const URL_WS = 'https://es.wikisource.org/wiki/Sobre_la_brevedad_de_la_vida';
  const URL_GB = 'https://www.gutenberg.org/ebooks/1';
  const TEXTO_WS = 'Texto de la primera edición.';
  const TEXTO_GB = 'Texto de la segunda edición.';
  const dosEdiciones = (cabeceraGutenberg: string) => ({
    'autores/seneca.yml': AUTOR_VALIDO,
    'temas/el-tiempo.yml': TEMA_VALIDO,
    'citas/seneca--a.md': citaValida({
      slug: 'seneca-a',
      texto: TEXTO_WS,
      procedencia: { obra: 'Sobre la brevedad de la vida', año: 49 },
      fuente: { id: 'wikisource-es', url: URL_WS },
    }),
    'citas/seneca--b.md': citaValida({
      slug: 'seneca-b',
      texto: TEXTO_GB,
      procedencia: { obra: 'Sobre la Brevedad de la Vida', año: 49 },
      fuente: { id: 'gutenberg', url: URL_GB },
    }),
    'fuentes/wikisource-es--sobre-la-brevedad-de-la-vida.txt': componerDocumento(
      { fuente: 'wikisource-es', obra: 'Sobre la brevedad de la vida', url: URL_WS, recuperado: '2026-08-21' },
      'Sobre la brevedad de la vida',
      TEXTO_WS,
    ),
    'fuentes/gutenberg--sobre-la-brevedad-de-la-vida.txt': componerDocumento(
      { fuente: 'gutenberg', obra: cabeceraGutenberg, url: URL_GB, recuperado: '2026-08-21' },
      cabeceraGutenberg,
      TEXTO_GB,
    ),
  });

  it('dos grafías, las dos literales de sus documentos: construye', async () => {
    const r = await construirConCorpus(dosEdiciones('Sobre la Brevedad de la Vida'));
    aLimpiar.push(r.proyecto);
    expect(r.codigo, r.salida).toBe(0);
  });

  it('las mismas dos grafías con una cabecera que no es la de su Cita: rompe', async () => {
    const r = await construirConCorpus(dosEdiciones('Sobre la brevedad de la vida'));
    aLimpiar.push(r.proyecto);
    expect(r.codigo).not.toBe(0);
    expect(r.salida).toContain('corpus/citas/seneca--b.md declara «Sobre la Brevedad de la Vida»');
    expect(r.salida).not.toContain('corpus/citas/seneca--a.md declara');
  });
});
