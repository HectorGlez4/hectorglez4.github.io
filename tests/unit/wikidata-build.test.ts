import { afterAll, describe, expect, it } from 'vitest';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { AUTOR_VALIDO, TEMA_VALIDO, citaValida, construirConCorpus, limpiar } from './ayuda/construir.js';
import { formaDeObra } from '../../src/lib/obras.ts';
import { componerVigentes, nombreDeDocumentoDeWikidata } from '../../tools/lib/wikidata.ts';
import { aEntidad, aTiempo, documento, entidad } from './ayuda/wikidata.ts';

/**
 * Historia 32.1 — el build repite las comprobaciones de `npm run obra -- wikidata`.
 *
 * `wikidata.test.ts` prueba las reglas sin construir. Esto construye: una ficha con una entidad
 * bien atada construye y su `dist/` no contiene nada de Wikidata (la 32.1 no pinta nada), y cada
 * fallo —documento ausente, de otra revisión o de otra entidad, autor que no concuerda o sin
 * vigente, `vigentes.yml` ilegible o con una vigente sin documento— rompe nombrando la ficha (o
 * `vigentes.yml`).
 */

const aLimpiar: string[] = [];
afterAll(async () => {
  await Promise.all(aLimpiar.map(limpiar));
});

async function construir(corpus: Record<string, string>) {
  const resultado = await construirConCorpus(corpus);
  aLimpiar.push(resultado.proyecto);
  return resultado;
}

/** Lo que no puede aparecer en `dist/`: identificadores, revisiones y etiquetas inventadas. */
const REVISION = 987654321;
const GENERO = 'Génerozafiro inventado';
const LENGUA = 'Lenguazafiro inventada';

const SENECA = entidad('Q2054', 30, { es: 'Séneca' });
const GENERO_E = entidad('Q8261', 40, { es: GENERO });
const LENGUA_E = entidad('Q1321', 41, { es: LENGUA });
const PRADA = entidad('Q3', 31, { es: 'Manuel González Prada' });
const OBRA = entidad('Q480', REVISION, {
  es: 'Sobre la brevedad de la vida',
  claims: {
    P50: [aEntidad('Q2054')],
    P136: [aEntidad('Q8261')],
    P407: [aEntidad('Q1321')],
    P577: [aTiempo('+0049-00-00T00:00:00Z')],
  },
});

const enCarpeta = (...entidades: Record<string, unknown>[]) =>
  Object.fromEntries(
    entidades.map((e) => [`wikidata/${nombreDeDocumentoDeWikidata(String(e.id), Number(e.lastrevid))}`, documento(e)]),
  );

const vigentes = (mapa: Record<string, number>) => ({
  'wikidata/vigentes.yml': componerVigentes(new Map(Object.entries(mapa))),
});

function ficha(titulo: string, wikidata?: { entidad: string; revision: number }): string {
  return (
    `autor: "seneca"\ntitulo: "${titulo}"\nformas:\n  - "${formaDeObra(titulo)}"\n` +
    (wikidata === undefined ? '' : `wikidata:\n  entidad: "${wikidata.entidad}"\n  revision: ${wikidata.revision}\n`)
  );
}

const BASE = {
  'autores/seneca.yml': AUTOR_VALIDO,
  'temas/el-tiempo.yml': TEMA_VALIDO,
  'citas/seneca--el-tiempo.md': citaValida(),
};

async function textoDeDist(proyecto: string): Promise<string> {
  const dist = join(proyecto, 'dist');
  const partes: string[] = [];
  for (const entrada of await readdir(dist, { recursive: true, withFileTypes: true })) {
    if (!entrada.isFile() || !/\.(html|xml|json|txt|js|css|webmanifest)$/u.test(entrada.name)) continue;
    partes.push(await readFile(join(entrada.parentPath, entrada.name), 'utf8'));
  }
  return partes.join('\n');
}

describe('Historia 32.1 — el build repite el cotejo de Wikidata', () => {
  it('una ficha bien atada construye, y su dist/ no contiene nada de Wikidata', async () => {
    const { codigo, salida, proyecto } = await construir({
      ...BASE,
      'obras/seneca--sobre-la-brevedad-de-la-vida.yml': ficha('Sobre la brevedad de la vida', {
        entidad: 'Q480',
        revision: REVISION,
      }),
      ...enCarpeta(OBRA, SENECA, GENERO_E, LENGUA_E),
      ...vigentes({ Q2054: 30, Q8261: 40, Q1321: 41 }),
    });
    expect(salida).not.toMatch(/Regla incumplida/);
    expect(codigo, salida).toBe(0);
    const texto = await textoDeDist(proyecto);
    for (const ausente of ['Q480', String(REVISION), GENERO, LENGUA, 'wikidata.org']) {
      expect(texto, ausente).not.toContain(ausente);
    }
  });

  it('cada fallo de una ficha, y una vigente sin documento, rompen nombrando la ficha y vigentes.yml', async () => {
    const otraEntidad = entidad('Q481', 501, { claims: { P50: [aEntidad('Q2054')] } });
    const { codigo, salida } = await construir({
      ...BASE,
      // Documento ausente.
      'obras/seneca--de-la-ira.yml': ficha('De la ira', { entidad: 'Q480', revision: 500 }),
      // El fichero de la revisión declarada es de otra entidad (su cabecera y sus datos dicen Q481).
      'obras/seneca--de-la-clemencia.yml': ficha('De la clemencia', { entidad: 'Q480', revision: 501 }),
      'wikidata/Q480--r501.json': documento(otraEntidad),
      // Autor ajeno.
      'obras/seneca--medea.yml': ficha('Medea', { entidad: 'Q482', revision: 502 }),
      ...enCarpeta(entidad('Q482', 502, { claims: { P50: [aEntidad('Q3')] } }), PRADA),
      // Autor sin vigente.
      'obras/seneca--fedra.yml': ficha('Fedra', { entidad: 'Q483', revision: 503 }),
      ...enCarpeta(entidad('Q483', 503, { claims: { P50: [aEntidad('Q77')] } })),
      // La buena, para que lo demás falle solo por lo suyo.
      'obras/seneca--sobre-la-brevedad-de-la-vida.yml': ficha('Sobre la brevedad de la vida', {
        entidad: 'Q480',
        revision: REVISION,
      }),
      ...enCarpeta(OBRA, SENECA, GENERO_E, LENGUA_E),
      // Q999 es vigente y no tiene documento.
      ...vigentes({ Q2054: 30, Q8261: 40, Q1321: 41, Q3: 31, Q999: 9 }),
    });
    expect(codigo).not.toBe(0);
    expect(salida).toMatch(/Regla incumplida: Wikidata/);
    expect(salida).toMatch(/seneca--de-la-ira\.yml declara wikidata Q480 r500: Falta el documento/);
    expect(salida).toMatch(/seneca--de-la-clemencia\.yml declara wikidata Q480 r501: Q480--r501\.json no es de Q480/);
    expect(salida).toMatch(/seneca--medea\.yml declara wikidata Q482 r502: .*«Manuel González Prada»/);
    expect(salida).toMatch(/seneca--fedra\.yml declara wikidata Q483 r503: Q77 no tiene revisión vigente/);
    expect(salida).toMatch(/vigentes\.yml declara una vigente sin su documento: Q999: 9/);
    expect(salida).not.toMatch(/seneca--sobre-la-brevedad-de-la-vida\.yml declara/);
  });

  it('un vigentes.yml ilegible rompe nombrándolo', async () => {
    const { codigo, salida } = await construir({
      ...BASE,
      'wikidata/vigentes.yml': 'Q1: cero\n',
    });
    expect(codigo).not.toBe(0);
    expect(salida).toMatch(/Regla incumplida: .*vigentes\.yml trae «Q1: cero»/);
  });
});
