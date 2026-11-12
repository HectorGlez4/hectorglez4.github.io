import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ATESTIGUADA,
  AUTOR_VALIDO,
  RAIZ,
  TEMA_VALIDO,
  citaValida,
  conLaPuertaAbierta,
  construirConCorpus,
  limpiar,
  paginaConstruida,
} from './ayuda/construir.js';
import { MENSAJE_CLASE_SIEMPRE_ESCRITA } from '../../src/lib/admision.ts';
import { CABECERA_DE_CLASES } from '../../tools/lib/corpus.ts';

/**
 * Historia 35.1 — la clase de una Cita es puerta del build.
 *
 * Lo puro está en `clase.test.ts` y `clases-de-cita.test.ts`; aquí, sobre proyectos construidos de
 * verdad: la atribuida de un Autor vivo construye y su ficha dice «N. 1950» sin `deathDate`, un
 * Autor vivo sin nacimiento no pinta años ni hueco, cada desacuerdo de la integración rompe
 * nombrando lo suyo, `clase: siempre` es error del esquema y, con plazo en una copia, la Cita de
 * siempre de un Autor protegido rompe. Las constantes se parchean en la copia, nunca en el árbol;
 * también las cinco de la puerta de la atribuida (Historia 35.1b), que aquí se abre en la copia
 * para medir la clase y no la puerta (`puerta-de-admision.test.ts`).
 */

const aLimpiar: string[] = [];
afterAll(async () => {
  await Promise.all(aLimpiar.map(limpiar));
});

const ATRIBUIDA = 'atribuida';

const VIVA = `nombre: Ana Ejemplo
vivo: true
añoNacimiento: 1950
semblanza: Escritora de prueba.
ordenAlfabetico: Ejemplo
`;
const VIVO_SIN_NACIMIENTO = `nombre: Luis Prueba
vivo: true
semblanza: Escritor de prueba.
ordenAlfabetico: Prueba
`;
const CERVANTES = `nombre: Miguel de Cervantes
añoNacimiento: 1547
añoFallecimiento: 1616
semblanza: Novelista.
ordenAlfabetico: Cervantes
`;
const RECIENTE = `nombre: Rosa Reciente
añoFallecimiento: 1980
semblanza: Poeta.
ordenAlfabetico: Reciente
`;

const citaDe = (autor: string, slug: string, texto: string, extra: Record<string, unknown> = {}) =>
  citaValida({
    texto,
    autor,
    slug,
    procedencia: { obra: `Obras de ${autor}`, año: 2000 },
    fuente: { id: 'wikisource-es', url: `https://es.wikisource.org/wiki/Obras_de_${autor}` },
    ...extra,
  });

const BASE = {
  'autores/seneca.yml': AUTOR_VALIDO,
  'temas/el-tiempo.yml': TEMA_VALIDO,
  'citas/seneca--no-es-que-tengamos-poco-tiempo.md': citaValida(),
};

describe('Historia 35.1 — la clase en el build', () => {
  it('la atribuida de un Autor vivo construye; su ficha dice «N. 1950» sin deathDate, y sin nacimiento no hay años', async () => {
    const r = await construirConCorpus({
      ...BASE,
      'autores/ana-ejemplo.yml': VIVA,
      'autores/luis-prueba.yml': VIVO_SIN_NACIMIENTO,
      'citas/ana-ejemplo--la-vida-es-corta.md': citaDe('ana-ejemplo', 'ana-ejemplo-la-vida-es-corta', 'La vida es corta.', {
        clase: ATRIBUIDA,
        estadoDerechos: undefined,
        ...ATESTIGUADA,
      }),
      'citas/luis-prueba--el-arte-es-largo.md': citaDe('luis-prueba', 'luis-prueba-el-arte-es-largo', 'El arte es largo.', {
        clase: ATRIBUIDA,
        estadoDerechos: undefined,
        ...ATESTIGUADA,
      }),
    }, { ficheros: conLaPuertaAbierta() });
    aLimpiar.push(r.proyecto);
    expect(r.codigo, r.salida).toBe(0);

    const ana = readFileSync(paginaConstruida(r.proyecto, '/autor/ana-ejemplo/'), 'utf8');
    expect(ana).toContain('<p class="años"');
    expect(ana).toMatch(/>N\. 1950</u);
    expect(ana).toContain('"birthDate":"1950"');
    expect(ana).not.toContain('deathDate');

    const luis = readFileSync(paginaConstruida(r.proyecto, '/autor/luis-prueba/'), 'utf8');
    expect(luis).not.toContain('class="años"');
    expect(luis).not.toContain('deathDate');
    expect(luis).not.toMatch(/Luis Prueba \(/u);

    const directorio = readFileSync(paginaConstruida(r.proyecto, '/autores/'), 'utf8');
    const fila = (nombre: string) => directorio.slice(directorio.indexOf(`>${nombre}<`)).split('</a>')[0];
    expect(fila('Ana Ejemplo')).toMatch(/N\. 1950<span aria-hidden="true"[^>]*> · <\/span>/u);
    expect(fila('Luis Prueba')).not.toContain(' · ');
    expect(fila('Luis Prueba')).toContain('1 cita');

    // La Página de Autor del Autor de siempre sigue diciendo sus años de siempre.
    const seneca = readFileSync(paginaConstruida(r.proyecto, '/autor/seneca/'), 'utf8');
    expect(seneca).toContain('"deathDate":"65"');

    // El `Person` del JSON-LD de la Página de Cita (`DatosEstructurados.astro`): sin deathDate
    // para un Autor vivo, y sin ninguna de las dos fechas si no consta su nacimiento.
    const citaDeAna = readFileSync(paginaConstruida(r.proyecto, '/cita/ana-ejemplo-la-vida-es-corta/'), 'utf8');
    expect(citaDeAna).toContain('"birthDate":"1950"');
    expect(citaDeAna).not.toContain('deathDate');
    const citaDeLuis = readFileSync(paginaConstruida(r.proyecto, '/cita/luis-prueba-el-arte-es-largo/'), 'utf8');
    expect(citaDeLuis).not.toContain('birthDate');
    expect(citaDeLuis).not.toContain('deathDate');
    const citaDeSeneca = readFileSync(paginaConstruida(r.proyecto, '/cita/seneca-no-es-que-tengamos-poco-tiempo/'), 'utf8');
    expect(citaDeSeneca).toContain('"deathDate":"65"');
  });

  it('cada desacuerdo con el registro y con los derechos rompe nombrando lo suyo', async () => {
    const linea = (slug: string, clase: string) => `  - { slug: "${slug}", clase: ${clase}, fecha: "2026-11-07" }\n`;
    const r = await construirConCorpus({
      ...BASE,
      'autores/ana-ejemplo.yml': VIVA,
      'autores/miguel-de-cervantes.yml': CERVANTES,
      'citas/miguel-de-cervantes--falta.md': citaDe('miguel-de-cervantes', 'miguel-de-cervantes-falta', 'Falta en el registro.'),
      'citas/miguel-de-cervantes--distinta.md': citaDe('miguel-de-cervantes', 'miguel-de-cervantes-distinta', 'Otra clase.'),
      'citas/miguel-de-cervantes--doble.md': citaDe('miguel-de-cervantes', 'miguel-de-cervantes-doble', 'Dos clases.'),
      'citas/miguel-de-cervantes--sin-derechos.md': citaDe(
        'miguel-de-cervantes',
        'miguel-de-cervantes-sin-derechos',
        'Atribuida sin derechos.',
        { clase: ATRIBUIDA, estadoDerechos: undefined, ...ATESTIGUADA },
      ),
      'citas/ana-ejemplo--de-siempre.md': citaDe('ana-ejemplo', 'ana-ejemplo-de-siempre', 'De siempre y viva.'),
      'clases-de-cita.yml':
        CABECERA_DE_CLASES +
        linea('seneca-no-es-que-tengamos-poco-tiempo', 'siempre') +
        linea('miguel-de-cervantes-distinta', ATRIBUIDA) +
        linea('miguel-de-cervantes-doble', 'siempre') +
        linea('miguel-de-cervantes-doble', ATRIBUIDA) +
        linea('miguel-de-cervantes-sin-derechos', ATRIBUIDA) +
        linea('ana-ejemplo-de-siempre', 'siempre'),
    }, { ficheros: conLaPuertaAbierta() });
    aLimpiar.push(r.proyecto);
    expect(r.codigo).not.toBe(0);
    expect(r.salida).toContain(
      'corpus/citas/miguel-de-cervantes--falta.md: la Cita «miguel-de-cervantes-falta» no está en corpus/clases-de-cita.yml. ' +
        'Anótela con: npx tsx tools/clases.ts sembrar',
    );
    expect(r.salida).toMatch(/miguel-de-cervantes--distinta\.md: la Cita «miguel-de-cervantes-distinta» es siempre y el registro la anota como atribuida/u);
    expect(r.salida).toMatch(/el slug «miguel-de-cervantes-doble» está registrado con dos clases/u);
    expect(r.salida).toMatch(/ana-ejemplo--de-siempre\.md: .*corpus\/autores\/ana-ejemplo\.yml.*no es de dominio público/u);
    expect(r.salida).toMatch(/miguel-de-cervantes--sin-derechos\.md: .*atribuida .*no tiene derechos/u);
    expect(r.salida).toContain('Clases de Cita: 5 desacuerdos');
  });

  it('«clase: siempre» escrito es error del esquema con su mensaje', async () => {
    const r = await construirConCorpus({
      ...BASE,
      'citas/seneca--no-es-que-tengamos-poco-tiempo.md': citaValida({ clase: 'siempre' }),
    });
    aLimpiar.push(r.proyecto);
    expect(r.codigo).not.toBe(0);
    expect(r.salida).toContain(MENSAJE_CLASE_SIEMPRE_ESCRITA);
  });

  it('con plazo en la copia, la Cita de siempre de un Autor protegido rompe nombrando la Cita', async () => {
    const umbrales = readFileSync(join(RAIZ, 'src/lib/umbrales.ts'), 'utf8');
    // Sustituye el valor que tengan, sea cual sea: ninguna prueba fija el de las constantes.
    const parcheado = umbrales
      .replace(
        /^export const PLAZO_DE_PROTECCION_AÑOS: number \| undefined = [^;\n]+;/mu,
        'export const PLAZO_DE_PROTECCION_AÑOS: number | undefined = 70;',
      )
      .replace(/^export const AÑO_DE_REFERENCIA: number \| undefined = [^;\n]+;/mu, 'export const AÑO_DE_REFERENCIA: number | undefined = 2026;');
    expect(parcheado.match(/^export const (PLAZO_DE_PROTECCION_AÑOS|AÑO_DE_REFERENCIA): number \| undefined = (70|2026);$/gmu)).toHaveLength(2);
    const r = await construirConCorpus(
      {
        ...BASE,
        'autores/rosa-reciente.yml': RECIENTE,
        'citas/rosa-reciente--protegida.md': citaDe('rosa-reciente', 'rosa-reciente-protegida', 'Todavía protegida.'),
      },
      { ficheros: { 'src/lib/umbrales.ts': parcheado } },
    );
    aLimpiar.push(r.proyecto);
    expect(r.codigo).not.toBe(0);
    expect(r.salida).toMatch(/rosa-reciente--protegida\.md: la Cita «rosa-reciente-protegida» es de siempre .*no es de dominio público/u);
  });
});
